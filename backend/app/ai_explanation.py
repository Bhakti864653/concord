import logging
import os
from datetime import datetime, timezone

import anthropic
from fastapi import APIRouter, Depends, HTTPException

from .matching import explain_match
from .rate_limit import rate_limit
from .supabase_client import get_admin_client

router = APIRouter()
logger = logging.getLogger("concord")

MODEL = "claude-haiku-4-5-20251001"
PROMPT_VERSION = "v1"
MAX_EXPLANATION_CHARS = 700
ANTHROPIC_TIMEOUT_SECONDS = 12.0

SYSTEM_PROMPT = """\
You are writing a short, warm introduction between two people who have just \
been matched in a mentorship program called Concord. You are given a small \
set of verified facts about them below. Follow these rules exactly:

- Use only the facts provided. Never invent details, names, achievements, \
or circumstances that were not given to you.
- Never infer or speculate about sensitive or protected characteristics \
(for example race, ethnicity, gender, religion, disability, immigration \
status, or socioeconomic background), even if a fact seems to hint at one.
- Do not describe or reference the matching algorithm, "Gale-Shapley," \
"stable matching," or any technical/algorithmic language.
- Do not promise or imply that the mentorship will succeed, that they will \
get along, or guarantee any outcome.
- Write exactly 3 to 5 concise sentences in a warm, natural, human tone - \
not corporate, not effusive.
- Mention at least one specific, verified point of alignment from the \
facts given.
- Return plain text only: no markdown, no headers, no bullet points, no \
quotation marks around the whole response.
- Keep the entire response under 700 characters.\
"""


def _build_whitelisted_payload(
    mentee_goal: str, mentor_experience: str, shared_words: list[str]
) -> dict:
    """The *only* information this feature is allowed to send to Anthropic -
    everything else on either profile (tags, bios, ids, emails, messages,
    anything else in the row) is excluded by construction, not by a filter
    someone could forget to apply. Per an explicit product decision,
    shared_tags/circumstance_tags/background_tags are deliberately excluded
    even though the deterministic, in-app explanation still shows them -
    there's no established user consent for sending them to a third-party
    API specifically."""
    return {
        "mentee_goal": mentee_goal.strip(),
        "mentor_experience": mentor_experience.strip(),
        "shared_topics": shared_words[:8],
    }


def _build_user_message(payload: dict) -> str:
    lines = [
        f'Mentee\'s stated goal: "{payload["mentee_goal"]}"',
        f'Mentor\'s stated area of experience: "{payload["mentor_experience"]}"',
    ]
    if payload["shared_topics"]:
        lines.append(
            "Verified shared topics/skills between them: "
            + ", ".join(payload["shared_topics"])
        )
    lines.append("\nWrite the introduction now.")
    return "\n".join(lines)


def build_deterministic_fallback(
    mentee_goal: str,
    mentor_experience: str,
    shared_words: list[str],
    shared_tags: list[str],
) -> str:
    """Concord's own, non-AI fallback - built entirely locally, so it's free
    to reference shared_tags (already shown in the existing rules-based
    explanation) even though those tags are never sent to Anthropic. Used
    whenever the AI narrative is pending, failed, or generation was never
    triggered - the match page must always have something to show here."""
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


def generate_ai_explanation(match_id: str) -> None:
    """The background job: derives everything from `match_id` alone (never
    trusts a caller-supplied mentee/mentor pair), sends only the whitelisted
    facts to Anthropic, and always leaves the row in 'ready' or 'failed' -
    never raises, so a caller running this via BackgroundTasks can never
    have it affect the request/response it was scheduled from. Idempotent:
    if a row for this match already exists (in any status), this returns
    immediately without calling Anthropic again."""
    admin = get_admin_client()

    try:
        existing = (
            admin.table("match_ai_explanations")
            .select("match_id")
            .eq("match_id", match_id)
            .maybe_single()
            .execute()
        )
        if existing and existing.data:
            # Already generated (or in flight) - never charged twice for
            # the same match. Small theoretical race window against a
            # second, near-simultaneous call for the same match_id is
            # acceptable here: matches are only ever created one at a
            # time, from a single admin-triggered round advance.
            return

        admin.table("match_ai_explanations").insert(
            {"match_id": match_id, "status": "pending"}
        ).execute()
    except Exception:
        # Infrastructure not ready yet (e.g. the migration hasn't been run)
        # or a transient Supabase error - this must never raise out of a
        # BackgroundTasks job, and there's nothing useful to write a status
        # to if the table itself isn't reachable.
        logger.exception("Could not initialize match_ai_explanations row for match %s", match_id)
        return

    context = _load_match_context(admin, match_id)
    if not context:
        admin.table("match_ai_explanations").update(
            {"status": "failed", "error_code": "match_context_missing"}
        ).eq("match_id", match_id).execute()
        return

    payload = _build_whitelisted_payload(
        context["mentee_goal"], context["mentor_experience"], context["shared_words"]
    )

    try:
        client = anthropic.Anthropic(
            api_key=os.environ["ANTHROPIC_API_KEY"],
            timeout=ANTHROPIC_TIMEOUT_SECONDS,
            max_retries=2,
        )
        response = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": _build_user_message(payload)}],
        )
        text = "".join(
            block.text for block in response.content if getattr(block, "type", None) == "text"
        ).strip()
    except anthropic.APITimeoutError:
        logger.warning("AI explanation timed out for match %s", match_id)
        admin.table("match_ai_explanations").update(
            {"status": "failed", "error_code": "timeout"}
        ).eq("match_id", match_id).execute()
        return
    except anthropic.RateLimitError:
        logger.warning("AI explanation rate-limited for match %s", match_id)
        admin.table("match_ai_explanations").update(
            {"status": "failed", "error_code": "rate_limited"}
        ).eq("match_id", match_id).execute()
        return
    except Exception:
        # Deliberately broad and last: any other provider/network failure
        # (never a raw error body - see the module docstring above the
        # table's error_code column) still leaves the match page working
        # via the deterministic fallback, exactly like a timeout would.
        logger.exception("AI explanation generation failed for match %s", match_id)
        admin.table("match_ai_explanations").update(
            {"status": "failed", "error_code": "provider_error"}
        ).eq("match_id", match_id).execute()
        return

    if not text:
        admin.table("match_ai_explanations").update(
            {"status": "failed", "error_code": "empty_response"}
        ).eq("match_id", match_id).execute()
        return

    if len(text) > MAX_EXPLANATION_CHARS:
        text = text[:MAX_EXPLANATION_CHARS].rsplit(" ", 1)[0].rstrip(".,;: ") + "."

    admin.table("match_ai_explanations").update(
        {
            "status": "ready",
            "explanation": text,
            "model": MODEL,
            "prompt_version": PROMPT_VERSION,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
    ).eq("match_id", match_id).execute()


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

    try:
        row_result = (
            admin.table("match_ai_explanations")
            .select("status, explanation")
            .eq("match_id", match_id)
            .maybe_single()
            .execute()
        )
        row = row_result.data if row_result else None
    except Exception:
        # Never let a hiccup reading *this* table (missing migration, a
        # transient Supabase error, anything) turn into a broken match
        # page - same "AI is a layer on top, never load-bearing"
        # philosophy as everywhere else in this feature. Falls through to
        # the deterministic fallback below exactly as if generation were
        # still pending.
        logger.exception("Could not read match_ai_explanations for match %s", match_id)
        row = None
    status = row["status"] if row else "pending"

    if status == "ready" and row.get("explanation"):
        return {"status": "ready", "explanation": row["explanation"], "is_fallback": False}

    context = _load_match_context(admin, match_id)
    fallback = (
        build_deterministic_fallback(
            context["mentee_goal"],
            context["mentor_experience"],
            context["shared_words"],
            context["shared_tags"],
        )
        if context
        else "You've been thoughtfully matched based on the goals and experience you each shared."
    )
    return {"status": status, "explanation": fallback, "is_fallback": True}
