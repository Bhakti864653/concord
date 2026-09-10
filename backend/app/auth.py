import os

from fastapi import HTTPException
from supabase_auth.errors import AuthApiError

from .supabase_client import get_admin_client


def _get_user(authorization: str | None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    admin = get_admin_client()
    try:
        result = admin.auth.get_user(token)
    except AuthApiError:
        # supabase-py raises for an invalid/expired/malformed token rather
        # than returning a falsy result - without this, any stale session
        # crashes with an unhandled 502 instead of a clean, expected 401.
        raise HTTPException(status_code=401, detail="Invalid token")
    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return result.user


def get_user_id(authorization: str | None) -> str:
    return _get_user(authorization).id


def require_admin(authorization: str | None) -> str:
    """Gates operator-only actions (like triggering a matching run) behind
    the single admin account, identified by email - there's no separate
    admin role/table, this is a one-operator portfolio app."""
    user = _get_user(authorization)
    admin_email = os.environ["ADMIN_EMAIL"]
    if (user.email or "").lower() != admin_email.lower():
        raise HTTPException(status_code=403, detail="Admin only")
    return user.id
