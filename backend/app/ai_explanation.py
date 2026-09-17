from fastapi import APIRouter, Depends, HTTPException

from .matching import explain_match
from .rate_limit import rate_limit
from .supabase_client import get_admin_client

router = APIRouter()


def build_deterministic_fallback(
    mentee_goal: str,
    mentor_experience: str,
    shared_words: list[str],
    shared_tags: list[str],
) -> str:
    """Concord's own, non-AI narrative - built entirely locally from the same
    shared interests/tags the existing rules-based explanation already
    shows. Used to be a fallback for a paid Anthropic-generated narrative;
    that feature was removed (see DEVLOG) so this is now the only text
    shown here."""
    sentences = [f"{mentee_goal.strip().capitalize()} lines up well with {mentor_experience.strip()}."]

    alignment_parts = []
    if shared_words:
        alignment_parts.append(f"you both touched on {', '.join(shared_words[:2])} in your profiles")
    if shared_tags:
        alignment_parts.append(f"you share a {shared_tags[0].replace('-', ' ')} background")
    if alignment_parts:
        sentences.append(" and ".join(alignment_parts).capitalize() + ".")

    sentences.append("It's a solid starting point for a real conversation.")
    return " ".join(sentences)


def _load_match_context(admin, match_id: str) -> dict | None:
    match_result = (
        admin.table("matches")
        .select("mentee_user_id, mentor_user_id")
        .eq("id", match_id)
        .maybe_single()
        .execute()
    )
    match = match_result.data if match_result else None
    if not match:
        return None

    mentee_id = match["mentee_user_id"]
    mentor_id = match["mentor_user_id"]
    mentee = (
        admin.table("mentee_profiles").select("*").eq("user_id", mentee_id).maybe_single().execute()
    ).data
    mentor = (
        admin.table("mentor_profiles").select("*").eq("user_id", mentor_id).maybe_single().execute()
    ).data
    if not mentee or not mentor:
        return None

    reasons = explain_match(
        mentee["seeking_guidance_on"],
        mentee.get("other_tag_text"),
        mentee.get("circumstance_tags") or [],
        mentor["mentors_in"],
        mentor.get("other_tag_text"),
        mentor.get("background_tags") or [],
    )

    return {
        "mentee_id": mentee_id,
        "mentor_id": mentor_id,
        "mentee_goal": mentee["seeking_guidance_on"],
        "mentor_experience": mentor["mentors_in"],
        "shared_words": reasons["shared_words"],
        "shared_tags": reasons["shared_tags"],
    }


@router.get("/matches/{match_id}/ai-explanation")
def get_ai_explanation(
    match_id: str,
    user_id: str = Depends(
        rate_limit("ai-explanation", max_calls=60, window_seconds=3600)
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

    context = _load_match_context(admin, match_id)
    explanation = (
        build_deterministic_fallback(
            context["mentee_goal"],
            context["mentor_experience"],
            context["shared_words"],
            context["shared_tags"],
        )
        if context
        else "You've been thoughtfully matched based on the goals and experience you each shared."
    )
    return {"explanation": explanation}
