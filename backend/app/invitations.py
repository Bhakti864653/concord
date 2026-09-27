"""Consent-based mentor invitations.

An invitation is a private link, not a profile and not a match. The raw token exists only in the
link the inviter shares; the database keeps its sha256. Opening the link shows what Concord is;
nothing is accepted until the invited person signs in with a mentor account and claims it, and
even then they must finish onboarding and opt in (participation.py) before anyone can rank them.

No email is ever sent: Concord has no email provider configured, so the inviter shares the link
themselves, and the "sent" status is never set by this code.
"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, field_validator

from .rate_limit import check_ip_rate_limit, rate_limit, rate_limited_user
from .supabase_client import get_admin_client

router = APIRouter()

INVITATION_LIFETIME = timedelta(days=14)
MAX_OPEN_INVITATIONS_PER_USER = 20
# Statuses in which the link still works.
ACTIVE_STATUSES = ("ready_to_share", "sent", "opened")
LINK_PATH = "/invite/mentor/"

# Fields the inviter may see about their own invitations. Never the hashes or who claimed it.
INVITER_FIELDS = (
    "id, safe_display_name, organization_or_field, invitation_message, inviter_display_name, "
    "status, expires_at, opened_at, accepted_at, declined_at, revoked_at, created_at, updated_at"
)


# --- tokens -----------------------------------------------------------------------------------


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def new_token() -> tuple[str, str]:
    """(raw, hash). 32 bytes from the OS CSPRNG, URL-safe; only the hash is ever stored."""
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def hash_email(email: str) -> str:
    """Keyed hash so a stored value can't be reversed by hashing guesses without a server secret."""
    key = (os.getenv("INVITE_HASH_KEY") or os.environ["SUPABASE_SECRET_KEY"]).encode()
    return hmac.new(key, email.strip().lower().encode(), hashlib.sha256).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _ts(value) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def display_status(row: dict, now: datetime | None = None) -> str:
    """The stored status, except that a still-active invitation past its expiry reads "expired"."""
    now = now or _now()
    expires = _ts(row.get("expires_at"))
    if row.get("status") in ACTIVE_STATUSES and expires is not None and expires <= now:
        return "expired"
    return row.get("status", "draft")


def is_claimable(row: dict | None, now: datetime | None = None) -> bool:
    return bool(row) and display_status(row, now) in ACTIVE_STATUSES


def _for_inviter(row: dict, now: datetime | None = None) -> dict:
    visible = {k: row.get(k) for k in [f.strip() for f in INVITER_FIELDS.split(",")]}
    visible["status"] = display_status(row, now)
    return visible


# --- request bodies ---------------------------------------------------------------------------


class InvitationIn(BaseModel):
    safe_display_name: str = Field(min_length=1, max_length=80)
    email: str | None = Field(default=None, max_length=254)
    invitation_message: str | None = Field(default=None, max_length=500)
    organization_or_field: str | None = Field(default=None, max_length=120)
    inviter_display_name: str | None = Field(default=None, max_length=40)
    legitimate_reason_confirmed: bool

    @field_validator("safe_display_name", "invitation_message", "organization_or_field", "inviter_display_name")
    @classmethod
    def strip(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("email")
    @classmethod
    def email_shape(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        value = value.strip()
        if "@" not in value or value.startswith("@") or value.endswith("@") or " " in value:
            raise ValueError("That doesn't look like an email address")
        return value


class ConfirmIn(BaseModel):
    """The review screen's explicit acknowledgement."""

    understands_not_a_match: bool


class ClaimIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


# --- service functions (take the client, so tests can pass a fake) ----------------------------


def _own_invitation(admin, user_id: str, invitation_id: str) -> dict:
    rows = (
        admin.table("mentor_invitations")
        .select("*")
        .eq("id", invitation_id)
        .eq("inviter_user_id", user_id)
        .execute()
        .data
        or []
    )
    if not rows:
        # Same answer whether it doesn't exist or belongs to someone else.
        raise HTTPException(status_code=404, detail="Invitation not found")
    return rows[0]


def create_draft(admin, user_id: str, body: InvitationIn) -> dict:
    if not body.legitimate_reason_confirmed:
        raise HTTPException(
            status_code=400,
            detail="Please confirm you have a genuine reason to invite this person.",
        )
    if not body.safe_display_name:
        raise HTTPException(status_code=400, detail="Add a name or label for this person.")
    existing = (
        admin.table("mentor_invitations")
        .select("id, status, expires_at")
        .eq("inviter_user_id", user_id)
        .execute()
        .data
        or []
    )
    open_count = sum(1 for r in existing if display_status(r) in ("draft", *ACTIVE_STATUSES))
    if open_count >= MAX_OPEN_INVITATIONS_PER_USER:
        raise HTTPException(
            status_code=429,
            detail="You have a lot of open invitations. Revoke some before creating more.",
        )
    row = {
        "inviter_user_id": user_id,
        "safe_display_name": body.safe_display_name,
        "organization_or_field": body.organization_or_field,
        "invitation_message": body.invitation_message,
        "inviter_display_name": body.inviter_display_name,
        "invited_email_hash": hash_email(body.email) if body.email else None,
        "status": "draft",
    }
    inserted = admin.table("mentor_invitations").insert(row).execute().data or []
    return _for_inviter(inserted[0] if inserted else row)


def _issue_link(admin, invitation_id: str, now: datetime) -> dict:
    raw, token_hash = new_token()
    expires_at = now + INVITATION_LIFETIME
    admin.table("mentor_invitations").update(
        {
            "token_hash": token_hash,
            "status": "ready_to_share",
            "expires_at": expires_at.isoformat(),
            "updated_at": now.isoformat(),
        }
    ).eq("id", invitation_id).execute()
    return {"link_path": LINK_PATH + raw, "expires_at": expires_at.isoformat()}


def confirm(admin, user_id: str, invitation_id: str, body: ConfirmIn) -> dict:
    if not body.understands_not_a_match:
        raise HTTPException(status_code=400, detail="Please confirm the review before continuing.")
    row = _own_invitation(admin, user_id, invitation_id)
    if row.get("status") != "draft":
        raise HTTPException(status_code=409, detail="This invitation was already created.")
    return _issue_link(admin, invitation_id, _now())


def new_link(admin, user_id: str, invitation_id: str) -> dict:
    """Only the hash is stored, so a lost link can't be shown again. This issues a fresh one and
    the previous link stops working; the expiry restarts."""
    row = _own_invitation(admin, user_id, invitation_id)
    if not is_claimable(row):
        raise HTTPException(status_code=409, detail="This invitation is no longer active.")
    return _issue_link(admin, invitation_id, _now())


def revoke(admin, user_id: str, invitation_id: str) -> dict:
    row = _own_invitation(admin, user_id, invitation_id)
    if row.get("status") not in ("draft", *ACTIVE_STATUSES):
        raise HTTPException(status_code=409, detail="This invitation can't be revoked now.")
    now = _now().isoformat()
    admin.table("mentor_invitations").update(
        {"status": "revoked", "revoked_at": now, "token_hash": None, "updated_at": now}
    ).eq("id", invitation_id).execute()
    return {"status": "revoked"}


def list_for_inviter(admin, user_id: str) -> list[dict]:
    rows = (
        admin.table("mentor_invitations")
        .select("*")
        .eq("inviter_user_id", user_id)
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )
    return [_for_inviter(r) for r in rows]


def _by_token(admin, raw_token: str) -> dict | None:
    rows = (
        admin.table("mentor_invitations")
        .select("*")
        .eq("token_hash", hash_token(raw_token))
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


INVALID_LINK = "This invitation link isn't valid anymore."


def resolve_public(admin, raw_token: str) -> dict:
    """What the public invitation page may show. Any unusable token - unknown, expired, revoked,
    declined, already claimed - gets the same answer, so a link reveals nothing about itself."""
    row = _by_token(admin, raw_token)
    now = _now()
    if not is_claimable(row, now):
        if row and display_status(row, now) == "expired" and row.get("status") != "expired":
            admin.table("mentor_invitations").update(
                {"status": "expired", "updated_at": now.isoformat()}
            ).eq("id", row["id"]).execute()
        raise HTTPException(status_code=404, detail=INVALID_LINK)
    if row.get("status") != "opened":
        admin.table("mentor_invitations").update(
            {"status": "opened", "opened_at": row.get("opened_at") or now.isoformat(),
             "updated_at": now.isoformat()}
        ).eq("id", row["id"]).execute()
    return {
        "inviter_display_name": row.get("inviter_display_name"),
        "invitation_message": row.get("invitation_message"),
        "organization_or_field": row.get("organization_or_field"),
        "expires_at": row.get("expires_at"),
    }


def _consume(admin, row: dict, changes: dict) -> None:
    """Apply a final status only if the token is still the one we just checked. If two requests
    race, the second finds token_hash already cleared, updates nothing, and is refused."""
    updated = (
        admin.table("mentor_invitations")
        .update(changes)
        .eq("id", row["id"])
        .eq("token_hash", row["token_hash"])
        .execute()
        .data
        or []
    )
    if not updated:
        raise HTTPException(status_code=404, detail=INVALID_LINK)


def decline_public(admin, raw_token: str) -> dict:
    row = _by_token(admin, raw_token)
    if not is_claimable(row):
        raise HTTPException(status_code=404, detail=INVALID_LINK)
    now = _now().isoformat()
    _consume(
        admin,
        row,
        {"status": "declined", "declined_at": now, "token_hash": None, "updated_at": now},
    )
    return {"status": "declined"}


def claim(admin, user, raw_token: str) -> dict:
    """Accept an invitation with a signed-in mentor account. Single use: the token hash is
    cleared, so the same link can never be claimed twice. This creates no match, touches no
    preferences, and does not make the mentor available - participation.py does that, only after
    they finish onboarding and opt in themselves."""
    row = _by_token(admin, raw_token)
    if not is_claimable(row):
        raise HTTPException(status_code=404, detail=INVALID_LINK)
    if (user.user_metadata or {}).get("user_type") != "mentor":
        raise HTTPException(
            status_code=403,
            detail="Invitations are accepted with a mentor account. Account types can't be "
            "changed, so please create a mentor account to accept it.",
        )
    if row["inviter_user_id"] == user.id:
        raise HTTPException(status_code=403, detail="You can't accept your own invitation.")
    now = _now().isoformat()
    _consume(
        admin,
        row,
        {
            "status": "accepted",
            "accepted_at": now,
            "claimed_by_user_id": user.id,
            "token_hash": None,
            "updated_at": now,
        },
    )
    return {"status": "accepted", "next": "/onboarding/mentor"}


# --- routes -----------------------------------------------------------------------------------


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/invitations")
def create_invitation(
    body: InvitationIn,
    user_id: str = Depends(rate_limit("invitation-create", max_calls=10, window_seconds=3600)),
):
    return create_draft(get_admin_client(), user_id, body)


@router.post("/invitations/{invitation_id}/confirm")
def confirm_invitation(
    invitation_id: str,
    body: ConfirmIn,
    user_id: str = Depends(rate_limit("invitation-confirm", max_calls=20, window_seconds=3600)),
):
    return confirm(get_admin_client(), user_id, invitation_id, body)


@router.post("/invitations/{invitation_id}/new-link")
def new_invitation_link(
    invitation_id: str,
    user_id: str = Depends(rate_limit("invitation-new-link", max_calls=20, window_seconds=3600)),
):
    return new_link(get_admin_client(), user_id, invitation_id)


@router.post("/invitations/{invitation_id}/revoke")
def revoke_invitation(
    invitation_id: str,
    user_id: str = Depends(rate_limit("invitation-revoke", max_calls=30, window_seconds=3600)),
):
    return revoke(get_admin_client(), user_id, invitation_id)


@router.get("/invitations")
def my_invitations(
    user_id: str = Depends(rate_limit("invitation-list", max_calls=120, window_seconds=3600)),
):
    return {"invitations": list_for_inviter(get_admin_client(), user_id)}


@router.get("/invitations/public/{token}")
def open_invitation(token: str, request: Request):
    check_ip_rate_limit("invitation-open", _client_ip(request), 30, 3600)
    return resolve_public(get_admin_client(), token)


@router.post("/invitations/public/{token}/decline")
def decline_invitation(token: str, request: Request):
    check_ip_rate_limit("invitation-decline", _client_ip(request), 10, 3600)
    return decline_public(get_admin_client(), token)


@router.post("/invitations/claim")
def claim_invitation(
    body: ClaimIn,
    user=Depends(rate_limited_user("invitation-claim", max_calls=10, window_seconds=3600)),
):
    return claim(get_admin_client(), user, body.token)
