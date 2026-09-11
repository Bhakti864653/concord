import os
import secrets
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Header, HTTPException, Request

from .supabase_client import get_admin_client, get_anon_client

router = APIRouter()

DEMO_ACCOUNT_MAX_AGE = timedelta(hours=24)

# Per-IP fixed-window limit on /demo/start, since it's public and
# unauthenticated - same pattern as every other per-IP limiter in this app
# would be if one existed yet; in-memory is fine for a single instance.
DEMO_START_LIMIT = 5
DEMO_START_WINDOW = timedelta(hours=1)
_demo_start_calls: dict[str, list[datetime]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_demo_rate_limit(request: Request) -> None:
    ip = _client_ip(request)
    now = datetime.now(timezone.utc)
    cutoff = now - DEMO_START_WINDOW
    recent = [t for t in _demo_start_calls[ip] if t > cutoff]
    if len(recent) >= DEMO_START_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Too many demo sessions from this address. Try again later.",
        )
    recent.append(now)
    _demo_start_calls[ip] = recent


def _create_demo_user(admin, role: str) -> str:
    # .invalid is reserved by RFC 2606 for exactly this purpose - a domain
    # guaranteed to never resolve, so demo accounts can never collide with
    # or send mail to a real address.
    email = f"demo-{role}-{uuid.uuid4()}@concord-demo.invalid"
    password = secrets.token_urlsafe(24)
    created = admin.auth.admin.create_user(
        {
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": {"is_demo": True, "user_type": role},
        }
    )
    return created.user.id, email, password


@router.post("/demo/start")
def start_demo(request: Request):
    """Seeds a fully pre-matched demo: a fresh mentee account already paired
    with a fresh mentor account, with a goal, milestones, a note, a couple
    of chat messages, and an upcoming session already in place - so a
    visitor lands straight in the matched experience instead of an empty
    just-signed-up state or having to wait on a real matching round."""
    _check_demo_rate_limit(request)
    admin = get_admin_client()

    mentee_id, mentee_email, mentee_password = _create_demo_user(admin, "mentee")
    mentor_id, _, _ = _create_demo_user(admin, "mentor")

    admin.table("mentee_profiles").insert(
        {
            "user_id": mentee_id,
            "seeking_guidance_on": "Breaking into product design",
            "circumstance_tags": ["career-switcher"],
            "bio": "Self-taught designer trying to make the jump from marketing into product design.",
        }
    ).execute()
    admin.table("mentor_profiles").insert(
        {
            "user_id": mentor_id,
            "mentors_in": "Product design",
            "background": "8 years in product design across startups and larger tech companies.",
            "background_tags": ["career-switcher"],
            "availability_count": 1,
            "bio": "Happy to help someone navigate the same career switch I made a few years back.",
        }
    ).execute()

    match = (
        admin.table("matches")
        .insert({"mentee_user_id": mentee_id, "mentor_user_id": mentor_id})
        .execute()
        .data[0]
    )
    match_id = match["id"]

    goal = (
        admin.table("match_goals")
        .insert(
            {
                "match_id": match_id,
                "title": "Build a product design portfolio",
                "deadline": (datetime.now(timezone.utc) + timedelta(days=45)).date().isoformat(),
                "created_by": mentor_id,
            }
        )
        .execute()
        .data[0]
    )
    admin.table("match_milestones").insert(
        [
            {"goal_id": goal["id"], "title": "Pick 2-3 case studies to feature", "done": True},
            {"goal_id": goal["id"], "title": "Draft the first case study write-up", "done": False},
        ]
    ).execute()

    admin.table("match_notes").insert(
        {
            "match_id": match_id,
            "author_id": mentor_id,
            "body": "Great first call - let's use our next session to review your case study draft together.",
        }
    ).execute()

    admin.table("messages").insert(
        [
            {"match_id": match_id, "sender_id": mentee_id, "body": "Hi! Really excited to work together."},
            {
                "match_id": match_id,
                "sender_id": mentor_id,
                "body": "Likewise! Let's start with what got you interested in product design.",
            },
        ]
    ).execute()

    admin.table("match_sessions").insert(
        {
            "match_id": match_id,
            "scheduled_for": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat(),
            "created_by": mentor_id,
        }
    ).execute()

    admin.table("availability").upsert(
        [
            {"user_id": mentee_id, "slots": ["tue-evening", "thu-evening"]},
            {"user_id": mentor_id, "slots": ["tue-evening", "sat-morning"]},
        ]
    ).execute()

    anon = get_anon_client()
    signed_in = anon.auth.sign_in_with_password(
        {"email": mentee_email, "password": mentee_password}
    )
    if not signed_in.session:
        raise HTTPException(status_code=500, detail="Could not start a demo session")

    return {
        "access_token": signed_in.session.access_token,
        "refresh_token": signed_in.session.refresh_token,
    }


@router.post("/demo/cleanup")
def cleanup_demo_accounts(authorization: str | None = Header(default=None)):
    expected = f"Bearer {os.environ['DEMO_CLEANUP_SECRET']}"
    if not authorization or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")

    admin = get_admin_client()
    cutoff = datetime.now(timezone.utc) - DEMO_ACCOUNT_MAX_AGE

    # Deleting the auth user is enough - every demo-seeded row (profile,
    # match, goals/milestones, notes, messages, sessions, availability,
    # notifications) chains back to auth.users via "on delete cascade",
    # unlike Synaptiq's demo cleanup which has to delete table-by-table.
    deleted_count = 0
    for user in admin.auth.admin.list_users(per_page=1000):
        if not user.user_metadata.get("is_demo"):
            continue
        if user.created_at > cutoff:
            continue
        admin.auth.admin.delete_user(user.id)
        deleted_count += 1

    return {"deleted": deleted_count}
