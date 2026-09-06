import time
from collections import defaultdict

from fastapi import Header, HTTPException

from .auth import get_user_id

_calls: dict[tuple[str, str], list[float]] = defaultdict(list)


def _check_and_record(
    bucket: dict[tuple[str, str], list[float]],
    key: tuple[str, str],
    max_calls: int,
    window_seconds: float,
    now: float,
) -> bool:
    """Fixed-window check: True (and records the call) if `key` has made
    fewer than `max_calls` calls in the last `window_seconds`, False
    otherwise. Kept separate from the FastAPI dependency below so the
    counting logic can be unit tested without any auth/HTTP machinery."""
    cutoff = now - window_seconds
    recent = [t for t in bucket[key] if t > cutoff]
    allowed = len(recent) < max_calls
    if allowed:
        recent.append(now)
    bucket[key] = recent
    return allowed


def rate_limit(name: str, max_calls: int, window_seconds: float):
    """Returns a FastAPI dependency that authenticates the request (same as
    the plain get_user_id(authorization) call every endpoint already does)
    and enforces `max_calls` per `window_seconds` per user, scoped to
    `name` so different endpoints don't share one budget. In-memory,
    per-process - fine for this app's single free-tier instance; a restart
    just resets everyone's window."""

    def dependency(authorization: str | None = Header(default=None)) -> str:
        user_id = get_user_id(authorization)
        if not _check_and_record(
            _calls, (name, user_id), max_calls, window_seconds, time.monotonic()
        ):
            raise HTTPException(
                status_code=429,
                detail="You're doing that a lot - please wait a bit and try again.",
            )
        return user_id

    return dependency
