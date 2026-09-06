from fastapi import HTTPException

from .supabase_client import get_admin_client


def get_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ")
    admin = get_admin_client()
    result = admin.auth.get_user(token)
    if not result or not result.user:
        raise HTTPException(status_code=401, detail="Invalid token")
    return result.user.id
