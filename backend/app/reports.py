from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from .rate_limit import rate_limit
from .supabase_client import get_admin_client

router = APIRouter()

REPORT_KINDS = {"report", "block", "emergency_end"}
MATCH_ENDING_KINDS = {"block", "emergency_end"}


class ReportIn(BaseModel):
    kind: str
    reason: str
    message_id: str | None = None

    @field_validator("kind")
    @classmethod
    def known_kind(cls, value: str) -> str:
        if value not in REPORT_KINDS:
            raise ValueError(f"Unknown kind: {value}")
        return value

    @field_validator("reason")
    @classmethod
    def reason_not_blank(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("Reason cannot be blank")
        return trimmed


@router.post("/matches/{match_id}/report")
def submit_report(
    match_id: str,
    body: ReportIn,
    user_id: str = Depends(rate_limit("report", max_calls=20, window_seconds=3600)),
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

    if body.message_id:
        message_result = (
            admin.table("messages")
            .select("id, match_mentee_id")
            .eq("id", body.message_id)
            .maybe_single()
            .execute()
        )
        message = message_result.data if message_result else None
        if not message or message["match_mentee_id"] != match_id:
            raise HTTPException(
                status_code=400, detail="Message does not belong to this match"
            )

    admin.table("reports").insert(
        {
            "match_mentee_id": match_id,
            "reported_by": user_id,
            "message_id": body.message_id,
            "kind": body.kind,
            "reason": body.reason,
        }
    ).execute()

    match_ended = False
    if body.kind in MATCH_ENDING_KINDS and match["status"] == "active":
        admin.table("matches").update(
            {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat()}
        ).eq("mentee_user_id", match_id).execute()
        match_ended = True

    return {"status": "ok", "match_ended": match_ended}
