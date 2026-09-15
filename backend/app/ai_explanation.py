import logging
import os
from datetime import datetime, timedelta, timezone

import anthropic
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException

from .matching import explain_match
from .rate_limit import rate_limit
from .supabase_client import get_admin_client

router = APIRouter()
logger = logging.getLogger("concord")

MODEL = "claude-haiku-4-5-20251001"
PROMPT_VERSION = "v1"
MAX_EXPLANATION_CHARS = 700
ANTHROPIC_TIMEOUT_SECONDS = 20.0

# Bounded-retry policy - no Celery/Redis/queue: a "pending" row that's been
# sitting untouched longer than this was almost certainly orphaned by a
# server restart mid-generation (a real in-flight attempt is bounded by
# ANTHROPIC_TIMEOUT_SECONDS plus the SDK's own retries, well under this),
# so it's safe to reclaim. RETRYABLE_ERROR_CODES are transient-by-nature
# failures worth another attempt; anything else (e.g. missing match/profile
# context) is permanent and is never retried regardless of attempt_count.
MAX_ATTEMPTS = 3
STALE_PENDING_SECONDS = 120
RETRY_BACKOFF_SECONDS = 30
RETRYABLE_ERROR_CODES = {"timeout", "rate_limited", "provider_error", "empty_response"}

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


def _is_stale(last_attempt_iso: str | None, now: datetime) -> bool:
    if not last_attempt_iso:
        return True
    try:
        last_attempt = datetime.fromisoformat(last_attempt_iso)
    except ValueError:
        return True
    if last_attempt.tzinfo is None:
        last_attempt = last_attempt.replace(tzinfo=timezone.utc)
    return (now - last_attempt).total_seconds() >= STALE_PENDING_SECONDS


def _retry_due(next_retry_iso: str | None, now: datetime) -> bool:
    if not next_retry_iso:
        return True
    try:
        next_retry = datetime.fromisoformat(next_retry_iso)
    except ValueError:
        return True
    if next_retry.tzinfo is None:
        next_retry = next_retry.replace(tzinfo=timezone.utc)
    return now >= next_retry


def _claim_attempt(admin, match_id: str) -> int | None:
    """Atomically claims the right to (re)generate this match's
    explanation, returning the attempt number to use, or None if nothing
    should happen right now (already ready/in-flight/permanently failed/
    exhausted). Two paths, both race-safe against a concurrent caller
    doing the same thing for the same match_id:

    1. No row yet (brand-new match, or an existing/demo match that never
       had one): insert attempt 1. `match_id` is the table's primary key,
       so a simultaneous second caller's insert fails with a conflict -
       there can never be two first-attempt rows for the same match.
    2. A row exists and looks stale/transiently-failed and under the
       attempt cap: claim the next attempt via a conditional UPDATE
       (`eq(status=...)` + `eq(attempt_count=...)`). Postgres only ever
       lets one concurrent UPDATE match those exact old values - a second
       caller's identical update affects zero rows and gets nothing back.
    """
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()

    try:
        admin.table("match_ai_explanations").insert(
            {
                "match_id": match_id,
                "status": "pending",
                "attempt_count": 1,
                "last_attempt_at": now_iso,
            }
        ).execute()
        return 1
    except Exception:
        pass  # a row already exists - fall through to the retry path below

    try:
        existing = (
            admin.table("match_ai_explanations")
            .select("status, error_code, attempt_count, last_attempt_at, next_retry_at")
            .eq("match_id", match_id)
            .maybe_single()
            .execute()
        )
        row = existing.data if existing else None
    except Exception:
        logger.warning("ai_explanation_table_unreachable match_id=%s", match_id)
        return None

    if not row:
        return None

    attempt_count = row.get("attempt_count") or 0
    if attempt_count >= MAX_ATTEMPTS:
        return None

    status = row.get("status")
    if status == "failed":
        eligible = row.get("error_code") in RETRYABLE_ERROR_CODES and _retry_due(
            row.get("next_retry_at"), now
        )
    elif status == "pending":
        eligible = _is_stale(row.get("last_attempt_at"), now)
    else:
        eligible = False  # "ready" - never regenerate a success

    if not eligible:
        return None

    next_attempt = attempt_count + 1
    try:
        result = (
            admin.table("match_ai_explanations")
            .update(
                {
                    "status": "pending",
                    "attempt_count": next_attempt,
                    "last_attempt_at": now_iso,
                    "next_retry_at": None,
                }
            )
            .eq("match_id", match_id)
            .eq("status", status)
            .eq("attempt_count", attempt_count)
            .execute()
        )
    except Exception:
        logger.warning("ai_explanation_table_unreachable match_id=%s", match_id)
        return None

    if not (result and result.data):
        return None  # lost the race to another concurrent claimant
    return next_attempt


def _mark_failed(admin, match_id: str, error_code: str, attempt_number: int) -> None:
    next_retry_at = None
    if error_code in RETRYABLE_ERROR_CODES and attempt_number < MAX_ATTEMPTS:
        next_retry_at = (
            datetime.now(timezone.utc) + timedelta(seconds=RETRY_BACKOFF_SECONDS * attempt_number)
        ).isoformat()
    admin.table("match_ai_explanations").update(
        {"status": "failed", "error_code": error_code, "next_retry_at": next_retry_at}
    ).eq("match_id", match_id).execute()


def generate_ai_explanation(match_id: str) -> None:
    """The background job: derives everything from `match_id` alone (never
    trusts a caller-supplied mentee/mentor pair), sends only the whitelisted
    facts to Anthropic, and always leaves the row in 'ready' or 'failed' -
    never raises, so a caller running this via BackgroundTasks can never
    have it affect the request/response it was scheduled from. Safe to call
    for the same match_id from multiple places (round-advance, the lazy GET
    recovery path, a retry sweep) - `_claim_attempt` is the single gate that
    decides whether this call actually does anything."""
    admin = get_admin_client()

    attempt_number = _claim_attempt(admin, match_id)
    if attempt_number is None:
        return

    context = _load_match_context(admin, match_id)
    if not context:
        # Permanent failure - missing match/profile context won't fix
        # itself on retry, so error_code is deliberately outside
        # RETRYABLE_ERROR_CODES and _mark_failed leaves next_retry_at unset.
        _mark_failed(admin, match_id, "match_context_missing", attempt_number)
        return

    payload = _build_whitelisted_payload(
        context["mentee_goal"], context["mentor_experience"], context["shared_words"]
    )

    try:
        client = anthropic.Anthropic(
            api_key=os.environ["ANTHROPIC_API_KEY"],
            timeout=ANTHROPIC_TIMEOUT_SECONDS,
            max_retries=3,
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
        logger.warning(
            "ai_explanation_generation_failed match_id=%s error_code=timeout attempt=%s",
            match_id,
            attempt_number,
        )
        _mark_failed(admin, match_id, "timeout", attempt_number)
        return
    except anthropic.RateLimitError:
        logger.warning(
            "ai_explanation_generation_failed match_id=%s error_code=rate_limited attempt=%s",
            match_id,
            attempt_number,
        )
        _mark_failed(admin, match_id, "rate_limited", attempt_number)
        return
    except Exception as exc:
        # Deliberately broad and last: any other provider/network failure
        # still leaves the match page working via the deterministic
        # fallback, exactly like a timeout would. Never log str(exc) or the
        # exception object itself (via logger.exception) - a provider
        # error can carry request/response detail that doesn't belong in
        # logs. type(exc).__name__ is a safe, coarse category only.
        logger.warning(
            "ai_explanation_generation_failed match_id=%s error_code=provider_error "
            "attempt=%s error_type=%s cause_type=%s",
            match_id,
            attempt_number,
            type(exc).__name__,
            type(exc.__cause__).__name__ if exc.__cause__ else None,
        )
        _mark_failed(admin, match_id, "provider_error", attempt_number)
        return

    if not text:
        _mark_failed(admin, match_id, "empty_response", attempt_number)
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
    background_tasks: BackgroundTasks,
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
        logger.warning("ai_explanation_table_unreachable match_id=%s", match_id)
        row = None
    status = row["status"] if row else "pending"

    if status == "ready" and row.get("explanation"):
        return {"status": "ready", "explanation": row["explanation"], "is_fallback": False}

    # Lazy-generation recovery path: covers matches that never went through
    # the round-advance flow (matches that predate this feature, and
    # demo.py's direct-insert matches) as well as a stale/transiently-failed
    # row that's due for a retry. generate_ai_explanation's own
    # _claim_attempt is the single source of truth for whether this
    # actually does anything - scheduling it here is always safe, even if
    # a row already exists and isn't eligible (it just no-ops after one
    # extra read). The page never waits for this - it always returns the
    # deterministic fallback below immediately.
    background_tasks.add_task(generate_ai_explanation, match_id)

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
