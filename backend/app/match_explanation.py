from fastapi import APIRouter, Depends, HTTPException

from .matching import explain_match
from .rate_limit import rate_limit
from .supabase_client import get_admin_client

router = APIRouter()


def _rank_of(ranked_ids: list[str] | None, target_id: str) -> int | None:
    """1-indexed position of target_id in a ranked preference list, or None
    if the list is empty/missing or doesn't contain it (unranked -
    Gale-Shapley's own "mutually unacceptable" case, not an error)."""
    if not ranked_ids:
        return None
    try:
        return ranked_ids.index(target_id) + 1
    except ValueError:
        return None


@router.get("/matches/{match_id}/explanation")
def match_explanation(
    match_id: str,
    user_id: str = Depends(
        rate_limit("match-explanation", max_calls=60, window_seconds=3600)
    ),
):
    admin = get_admin_client()

    match_result = (
        admin.table("matches")
        .select("mentee_user_id, mentor_user_id")
        .eq("id", match_id)
        .maybe_single()
        .execute()
    )
    match = match_result.data if match_result else None
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if user_id not in (match["mentee_user_id"], match["mentor_user_id"]):
        raise HTTPException(status_code=403, detail="Not a participant in this match")

    mentee_id = match["mentee_user_id"]
    mentor_id = match["mentor_user_id"]

    mentee_result = (
        admin.table("mentee_profiles").select("*").eq("user_id", mentee_id).maybe_single().execute()
    )
    mentee = mentee_result.data if mentee_result else None
    mentor_result = (
        admin.table("mentor_profiles").select("*").eq("user_id", mentor_id).maybe_single().execute()
    )
    mentor = mentor_result.data if mentor_result else None
    if not mentee or not mentor:
        raise HTTPException(status_code=404, detail="Profile missing")

    reasons = explain_match(
        mentee["seeking_guidance_on"],
        mentee.get("other_tag_text"),
        mentee.get("circumstance_tags") or [],
        mentor["mentors_in"],
        mentor.get("other_tag_text"),
        mentor.get("background_tags") or [],
    )

    mentee_prefs_result = (
        admin.table("mentee_preferences")
        .select("ranked_mentor_ids")
        .eq("user_id", mentee_id)
        .maybe_single()
        .execute()
    )
    mentee_prefs = mentee_prefs_result.data if mentee_prefs_result else None
    mentor_prefs_result = (
        admin.table("mentor_preferences")
        .select("ranked_mentee_ids")
        .eq("user_id", mentor_id)
        .maybe_single()
        .execute()
    )
    mentor_prefs = mentor_prefs_result.data if mentor_prefs_result else None

    mentee_rank_of_mentor = _rank_of(
        (mentee_prefs or {}).get("ranked_mentor_ids"), mentor_id
    )
    mentor_rank_of_mentee = _rank_of(
        (mentor_prefs or {}).get("ranked_mentee_ids"), mentee_id
    )

    capacity = mentor.get("availability_count", 1)
    matched_count = len(
        admin.table("matches")
        .select("mentee_user_id")
        .eq("mentor_user_id", mentor_id)
        .eq("status", "active")
        .execute()
        .data
        or []
    )

    return {
        "shared_words": reasons["shared_words"],
        "shared_tags": reasons["shared_tags"],
        "mentee_rank_of_mentor": mentee_rank_of_mentor,
        "mentor_rank_of_mentee": mentor_rank_of_mentee,
        "mentor_capacity": capacity,
        "mentor_matched_count": matched_count,
    }
