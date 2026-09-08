from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from .rate_limit import rate_limit
from .supabase_client import get_admin_client

router = APIRouter()

REMATCH_REASONS = {
    "availability_conflict",
    "goals_changed",
    "mentor_unresponsive",
    "need_different_expertise",
    "personal_circumstances",
}


class RematchRequestIn(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def known_reason(cls, value: str) -> str:
        if value not in REMATCH_REASONS:
            raise ValueError(f"Unknown reason: {value}")
        return value


@router.post("/matches/{match_id}/rematch")
def request_rematch(
    match_id: str,
    body: RematchRequestIn,
    user_id: str = Depends(rate_limit("rematch", max_calls=10, window_seconds=3600)),
):
    admin = get_admin_client()

    match_result = (
        admin.table("matches")
        .select("mentee_user_id, mentor_user_id, status")
        .eq("mentee_user_id", match_id)
        .maybe_single()
        .execute()
    )
    match = match_result.data if match_result else None
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if user_id not in (match["mentee_user_id"], match["mentor_user_id"]):
        raise HTTPException(status_code=403, detail="Not a participant in this match")
    if match["status"] == "ended":
        raise HTTPException(status_code=409, detail="This match has already ended")

    # Quietly ends the match - no accusatory notification to the other
    # participant, just a status flip. The reason is logged privately for
    # the requester's own reference and never surfaced to their partner.
    admin.table("matches").update(
        {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}
    ).eq("mentee_user_id", match_id).execute()
    admin.table("rematch_requests").insert(
        {"match_mentee_id": match_id, "requested_by": user_id, "reason": body.reason}
    ).execute()

    return {"status": "ended"}
