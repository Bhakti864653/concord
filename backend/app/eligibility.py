"""Who is allowed into matching.

"Open enrollment, closed matching": a mentor may be shown to mentees, ranked, or matched only if
they have a real account and profile, finished onboarding, consented to being shown, opted into
matching in time for the round, are not suspended, and have capacity left. Invitation records are
never profiles, so they can't pass any of this; the guard below also rejects them by name in case
some other code path ever hands one over.
"""

from datetime import datetime


def _ts(value) -> datetime | None:
    if value is None or isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def is_mentor_eligible(profile: dict, round_row: dict | None) -> bool:
    """True if this mentor_profiles row may take part in `round_row` (the current round).

    Opting in after a round's preferences were locked means joining the *next* round: the check
    compares the opt-in time with this round's locked_at.
    """
    if not profile or profile.get("is_invitation"):
        return False
    if not profile.get("user_id"):
        return False
    if not profile.get("onboarding_completed_at"):
        return False
    if not profile.get("visible_to_mentees"):
        return False
    opted_in = _ts(profile.get("matching_opted_in_at"))
    if opted_in is None:
        return False
    if profile.get("suspended_at"):
        return False
    if (profile.get("availability_count") or 0) < 1:
        return False
    locked_at = _ts((round_row or {}).get("locked_at"))
    if locked_at is not None and opted_in > locked_at:
        return False
    return True


def remaining_capacity(profile: dict, active_count: int) -> int:
    return max(0, (profile.get("availability_count") or 0) - active_count)


def active_counts_by_mentor(active_matches: list[dict]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for m in active_matches:
        counts[m["mentor_user_id"]] = counts.get(m["mentor_user_id"], 0) + 1
    return counts


def eligible_mentors(
    profiles: list[dict],
    round_row: dict | None,
    active_counts: dict[str, int] | None = None,
    require_capacity: bool = False,
) -> list[dict]:
    active_counts = active_counts or {}
    out = []
    for p in profiles:
        if not is_mentor_eligible(p, round_row):
            continue
        if require_capacity and remaining_capacity(p, active_counts.get(p["user_id"], 0)) < 1:
            continue
        out.append(p)
    return out


def blocked_pairs(reports: list[dict], matches_by_id: dict[str, dict]) -> set[tuple[str, str]]:
    """(mentee_id, mentor_id) pairs where either side filed a block on their match. A blocked
    pair is never suggested or matched again."""
    pairs: set[tuple[str, str]] = set()
    for r in reports:
        if r.get("kind") != "block":
            continue
        match = matches_by_id.get(r.get("match_id"))
        if match:
            pairs.add((match["mentee_user_id"], match["mentor_user_id"]))
    return pairs


class IneligibleMatchingInput(ValueError):
    """Raised when something that is not an eligible mentor reaches the matching engine."""


def guard_matching_inputs(
    mentee_prefs: dict[str, list[str]],
    mentor_prefs: dict[str, list[str]],
    mentor_capacity: dict[str, int],
    eligible_mentor_ids: set[str],
) -> None:
    """The last check before Gale-Shapley runs. Every mentor key and every ranked mentor id must
    be an eligible mentor with capacity; anything else (an invitation id, an incomplete or
    unconsented profile) is a bug upstream, so the run stops instead of quietly matching it."""
    for mentor_id in list(mentor_prefs) + list(mentor_capacity):
        if mentor_id not in eligible_mentor_ids:
            raise IneligibleMatchingInput(f"Ineligible mentor in matching input: {mentor_id}")
    for mentee_id, ranked in mentee_prefs.items():
        for mentor_id in ranked:
            if mentor_id not in eligible_mentor_ids:
                raise IneligibleMatchingInput(
                    f"Mentee {mentee_id} ranked an ineligible mentor: {mentor_id}"
                )
    for mentor_id, cap in mentor_capacity.items():
        if cap < 1:
            raise IneligibleMatchingInput(f"Mentor without capacity in matching input: {mentor_id}")
