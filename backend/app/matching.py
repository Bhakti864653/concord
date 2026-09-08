import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from .rate_limit import rate_limit
from .rounds import require_preferences_open
from .supabase_client import get_admin_client

router = APIRouter()

TEXT_WEIGHT = 0.7
TAG_WEIGHT = 0.3

STOPWORDS = {
    "a", "an", "the", "in", "on", "of", "to", "into", "for", "with", "and",
    "or", "my", "your", "i", "am", "is", "are", "be", "as", "at", "from",
}


def _tokenize(*texts: str | None) -> set[str]:
    words: set[str] = set()
    for text in texts:
        if not text:
            continue
        for word in re.findall(r"[a-z0-9]+", text.lower()):
            if word not in STOPWORDS:
                words.add(word)
    return words


def _jaccard(a: set, b: set) -> float:
    if not a and not b:
        return 0.0
    union = a | b
    if not union:
        return 0.0
    return len(a & b) / len(union)


def score_pair(
    mentee_text: str | None,
    mentee_other: str | None,
    mentee_tags: list[str],
    mentor_text: str | None,
    mentor_other: str | None,
    mentor_tags: list[str],
) -> float:
    """Explainable, rule-based match score in [0, 1] - deliberately not an
    LLM/embedding call, so it stays easy to explain ("you matched because
    you both mentioned X and share tag Y") and cheap to run across every
    mentee x mentor pair."""
    text_score = _jaccard(
        _tokenize(mentee_text, mentee_other), _tokenize(mentor_text, mentor_other)
    )
    tag_score = _jaccard(set(mentee_tags), set(mentor_tags))
    return round(TEXT_WEIGHT * text_score + TAG_WEIGHT * tag_score, 4)


def explain_match(
    mentee_text: str | None,
    mentee_other: str | None,
    mentee_tags: list[str],
    mentor_text: str | None,
    mentor_other: str | None,
    mentor_tags: list[str],
) -> dict[str, list[str]]:
    """The actual words and tags behind a score_pair() result - the whole
    point of a rule-based score over an LLM/embedding one is that a match
    can be explained in plain terms, so this is surfaced right alongside
    the score rather than left implicit in the scoring math."""
    shared_words = sorted(
        _tokenize(mentee_text, mentee_other) & _tokenize(mentor_text, mentor_other)
    )
    shared_tags = sorted(set(mentee_tags) & set(mentor_tags))
    return {"shared_words": shared_words, "shared_tags": shared_tags}


@router.get("/matching/suggested-mentors")
def suggested_mentors(
    user_id: str = Depends(rate_limit("suggested-mentors", max_calls=60, window_seconds=3600)),
):
    admin = get_admin_client()

    mentee_result = (
        admin.table("mentee_profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    mentee = mentee_result.data if mentee_result else None
    if not mentee:
        raise HTTPException(status_code=404, detail="Create your mentee profile first")

    mentors = admin.table("mentor_profiles").select("*").execute().data or []

    scored = [
        {
            **m,
            "score": score_pair(
                mentee["seeking_guidance_on"],
                mentee.get("other_tag_text"),
                mentee.get("circumstance_tags") or [],
                m["mentors_in"],
                m.get("other_tag_text"),
                m.get("background_tags") or [],
            ),
            "match_reasons": explain_match(
                mentee["seeking_guidance_on"],
                mentee.get("other_tag_text"),
                mentee.get("circumstance_tags") or [],
                m["mentors_in"],
                m.get("other_tag_text"),
                m.get("background_tags") or [],
            ),
        }
        for m in mentors
    ]
    scored.sort(key=lambda m: m["score"], reverse=True)
    return {"mentors": scored}


@router.get("/matching/suggested-mentees")
def suggested_mentees(
    user_id: str = Depends(rate_limit("suggested-mentees", max_calls=60, window_seconds=3600)),
):
    admin = get_admin_client()

    mentor_result = (
        admin.table("mentor_profiles")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    mentor = mentor_result.data if mentor_result else None
    if not mentor:
        raise HTTPException(status_code=404, detail="Create your mentor profile first")

    mentees = admin.table("mentee_profiles").select("*").execute().data or []

    scored = [
        {
            **mt,
            "score": score_pair(
                mt["seeking_guidance_on"],
                mt.get("other_tag_text"),
                mt.get("circumstance_tags") or [],
                mentor["mentors_in"],
                mentor.get("other_tag_text"),
                mentor.get("background_tags") or [],
            ),
            "match_reasons": explain_match(
                mt["seeking_guidance_on"],
                mt.get("other_tag_text"),
                mt.get("circumstance_tags") or [],
                mentor["mentors_in"],
                mentor.get("other_tag_text"),
                mentor.get("background_tags") or [],
            ),
        }
        for mt in mentees
    ]
    scored.sort(key=lambda m: m["score"], reverse=True)
    return {"mentees": scored}


class PreferencesIn(BaseModel):
    ranked_ids: list[str]
    locked: bool = False

    @field_validator("ranked_ids")
    @classmethod
    def no_duplicates(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("ranked_ids must not contain duplicates")
        return value


def _save_preferences(
    table: str,
    id_column: str,
    other_table: str,
    user_id: str,
    body: PreferencesIn,
) -> None:
    admin = get_admin_client()

    existing_ids = {
        row["user_id"]
        for row in (admin.table(other_table).select("user_id").execute().data or [])
    }
    unknown = [i for i in body.ranked_ids if i not in existing_ids]
    if unknown:
        raise HTTPException(
            status_code=400, detail=f"Unknown profile id(s): {', '.join(unknown)}"
        )

    admin.table(table).upsert(
        {"user_id": user_id, id_column: body.ranked_ids, "locked": body.locked}
    ).execute()


@router.post("/preferences/mentee")
def save_mentee_preferences(
    body: PreferencesIn,
    user_id: str = Depends(rate_limit("preferences-mentee", max_calls=30, window_seconds=3600)),
):
    admin = get_admin_client()
    require_preferences_open(admin)
    # A mentor id missing from a mentee's ranked list is valid Gale-Shapley
    # semantics (unranked = unacceptable to that mentee), not an error.
    _save_preferences(
        "mentee_preferences", "ranked_mentor_ids", "mentor_profiles", user_id, body
    )
    return {"status": "ok"}


@router.post("/preferences/mentor")
def save_mentor_preferences(
    body: PreferencesIn,
    user_id: str = Depends(rate_limit("preferences-mentor", max_calls=30, window_seconds=3600)),
):
    admin = get_admin_client()
    require_preferences_open(admin)
    _save_preferences(
        "mentor_preferences", "ranked_mentee_ids", "mentee_profiles", user_id, body
    )
    return {"status": "ok"}
