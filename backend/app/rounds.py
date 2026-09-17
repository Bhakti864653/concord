from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException

from .auth import require_admin
from .gale_shapley import run_gale_shapley
from .supabase_client import get_admin_client

router = APIRouter()


def get_current_round(admin) -> dict:
    """The most recently created row is "the current round" - there's no
    separate is_current flag, since rounds are only ever appended (never
    edited after completion) and the newest one is always the live one."""
    result = (
        admin.table("matching_rounds")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    rows = result.data or []
    if not rows:
        raise HTTPException(status_code=500, detail="No matching round exists")
    return rows[0]


def require_preferences_open(admin) -> None:
    current = get_current_round(admin)
    if current["status"] != "preferences_open":
        raise HTTPException(
            status_code=409,
            detail="Preferences are locked for this matching round.",
        )


def _run_matching(admin) -> dict:
    """The actual Gale-Shapley run, scoped to only the currently-unmatched
    pool. Existing active matches are left untouched (only new rows are
    inserted) rather than wiped and recomputed on every run - rounds are
    meant to top up capacity incrementally for whoever is waitlisted, not
    reshuffle people who are already matched."""
    active_matches = (
        admin.table("matches")
        .select("mentee_user_id, mentor_user_id")
        .eq("status", "active")
        .execute()
        .data
        or []
    )
    matched_mentee_ids = {m["mentee_user_id"] for m in active_matches}
    active_count_by_mentor: dict[str, int] = {}
    for m in active_matches:
        active_count_by_mentor[m["mentor_user_id"]] = (
            active_count_by_mentor.get(m["mentor_user_id"], 0) + 1
        )

    mentee_rows = (
        admin.table("mentee_preferences")
        .select("user_id, ranked_mentor_ids")
        .eq("locked", True)
        .execute()
        .data
        or []
    )
    mentor_rows = (
        admin.table("mentor_preferences")
        .select("user_id, ranked_mentee_ids")
        .eq("locked", True)
        .execute()
        .data
        or []
    )
    mentor_capacity_rows = (
        admin.table("mentor_profiles").select("user_id, availability_count").execute().data
        or []
    )

    mentee_prefs = {
        row["user_id"]: row["ranked_mentor_ids"]
        for row in mentee_rows
        if row["user_id"] not in matched_mentee_ids
    }
    mentor_prefs = {row["user_id"]: row["ranked_mentee_ids"] for row in mentor_rows}
    mentor_capacity = {
        row["user_id"]: max(
            0, row["availability_count"] - active_count_by_mentor.get(row["user_id"], 0)
        )
        for row in mentor_capacity_rows
    }

    result = run_gale_shapley(mentee_prefs, mentor_prefs, mentor_capacity)

    if result:
        rows = [
            {"mentee_user_id": mentee_id, "mentor_user_id": mentor_id}
            for mentee_id, mentor_id in result.items()
        ]
        admin.table("matches").insert(rows).execute()

    return {
        "newly_matched_count": len(result),
        "still_waitlisted_count": len(mentee_prefs) - len(result),
    }


def _advance(admin, current: dict) -> dict:
    """The core state-transition logic, kept separate from the route so it
    can be unit tested without going through require_admin/header
    parsing."""
    now = datetime.now(timezone.utc).isoformat()
    status = current["status"]

    if status == "preferences_open":
        admin.table("matching_rounds").update(
            {"status": "preferences_locked", "locked_at": now}
        ).eq("id", current["id"]).execute()
        return {"status": "preferences_locked"}

    if status == "preferences_locked":
        admin.table("matching_rounds").update(
            {"status": "matching_in_progress", "matching_started_at": now}
        ).eq("id", current["id"]).execute()
        return {"status": "matching_in_progress"}

    if status == "matching_in_progress":
        result = _run_matching(admin)
        admin.table("matching_rounds").update(
            {"status": "results_available", "completed_at": now}
        ).eq("id", current["id"]).execute()
        return {"status": "results_available", **result}

    # results_available -> a fresh round starts, open for preferences again.
    admin.table("matching_rounds").insert({"status": "preferences_open"}).execute()
    return {"status": "preferences_open"}


@router.post("/matching/rounds/advance")
def advance_round(authorization: str | None = Header(default=None)):
    require_admin(authorization)
    admin = get_admin_client()
    current = get_current_round(admin)
    return _advance(admin, current)
