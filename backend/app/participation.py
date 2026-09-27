"""A mentor explicitly joining (or leaving) matching.

This is the only place that sets the participation columns on mentor_profiles; signed-in users
can't write them directly (see migrations/2026-09-26_mentor_invitations.sql). Joining requires
every onboarding step to be done, so an invited person goes through exactly the same path as
anyone else - an invitation never skips a step or shortens the queue.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from .eligibility import is_mentor_eligible
from .rate_limit import rate_limited_user
from .rounds import get_current_round
from .supabase_client import get_admin_client

router = APIRouter()


class JoinIn(BaseModel):
    confirms_wants_to_mentor: bool
    reviewed_privacy: bool
    consents_to_be_shown: bool
    joins_matching: bool


def _require_mentor(user) -> None:
    if (user.user_metadata or {}).get("user_type") != "mentor":
        raise HTTPException(status_code=403, detail="Only mentor accounts can join as a mentor.")


def _profile(admin, user_id: str) -> dict | None:
    rows = admin.table("mentor_profiles").select("*").eq("user_id", user_id).execute().data or []
    return rows[0] if rows else None


def _slots(admin, user_id: str) -> list[str]:
    rows = admin.table("availability").select("slots").eq("user_id", user_id).execute().data or []
    return (rows[0].get("slots") if rows else None) or []


def missing_steps(profile: dict | None, slots: list[str]) -> list[str]:
    """Onboarding steps still to do before a mentor can join matching."""
    if not profile:
        return ["profile"]
    missing = []
    if not (profile.get("mentors_in") or "").strip():
        missing.append("topics")
    if not (profile.get("bio") or "").strip() or not (profile.get("background") or "").strip():
        missing.append("profile")
    if (profile.get("availability_count") or 0) < 1:
        missing.append("capacity")
    if not slots:
        missing.append("availability")
    return missing


def round_placement(round_row: dict | None) -> str:
    """Joining while preferences are open means this round; otherwise the next one."""
    return "current" if (round_row or {}).get("status") == "preferences_open" else "next"


def status(admin, user_id: str) -> dict:
    profile = _profile(admin, user_id)
    round_row = get_current_round(admin)
    return {
        "has_profile": profile is not None,
        "missing_steps": missing_steps(profile, _slots(admin, user_id)),
        "joined": bool(profile and profile.get("matching_opted_in_at")
                       and profile.get("visible_to_mentees")),
        "available_now": bool(profile and is_mentor_eligible(profile, round_row)),
        "suspended": bool(profile and profile.get("suspended_at")),
        "round_status": (round_row or {}).get("status"),
    }


def join(admin, user_id: str, body: JoinIn) -> dict:
    if not all(
        [body.confirms_wants_to_mentor, body.reviewed_privacy, body.consents_to_be_shown,
         body.joins_matching]
    ):
        raise HTTPException(status_code=400, detail="Every step needs your confirmation first.")
    profile = _profile(admin, user_id)
    missing = missing_steps(profile, _slots(admin, user_id))
    if missing:
        raise HTTPException(
            status_code=400, detail=f"Finish these steps first: {', '.join(missing)}."
        )
    if profile.get("suspended_at"):
        raise HTTPException(status_code=403, detail="This account can't join matching right now.")
    now = datetime.now(timezone.utc).isoformat()
    admin.table("mentor_profiles").update(
        {
            "onboarding_completed_at": profile.get("onboarding_completed_at") or now,
            "visible_to_mentees": True,
            "matching_opted_in_at": now,
        }
    ).eq("user_id", user_id).execute()
    return {"status": "joined", "round": round_placement(get_current_round(admin))}


def leave(admin, user_id: str) -> dict:
    """Stop being shown and matched. Existing matches are not ended by this."""
    admin.table("mentor_profiles").update(
        {"visible_to_mentees": False, "matching_opted_in_at": None}
    ).eq("user_id", user_id).execute()
    return {"status": "left"}


@router.get("/mentors/participation")
def get_participation(
    user=Depends(rate_limited_user("participation-status", max_calls=120, window_seconds=3600)),
):
    _require_mentor(user)
    return status(get_admin_client(), user.id)


@router.post("/mentors/participation")
def join_matching(
    body: JoinIn,
    user=Depends(rate_limited_user("participation-join", max_calls=20, window_seconds=3600)),
):
    _require_mentor(user)
    return join(get_admin_client(), user.id, body)


@router.post("/mentors/participation/leave")
def leave_matching(
    user=Depends(rate_limited_user("participation-leave", max_calls=20, window_seconds=3600)),
):
    _require_mentor(user)
    return leave(get_admin_client(), user.id)
