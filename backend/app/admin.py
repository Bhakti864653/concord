from fastapi import APIRouter, Header

from .auth import require_admin
from .rounds import get_current_round
from .supabase_client import get_admin_client

router = APIRouter()


@router.get("/admin/dashboard")
def admin_dashboard(authorization: str | None = Header(default=None)):
    """Everything here is only reachable through RLS-bypassing admin-client
    reads - reports are private to their own author, and matches are only
    readable by their two participants, so there's no way for even the
    admin's own frontend session to assemble this view via direct Supabase
    reads the way the rest of the app does."""
    require_admin(authorization)
    admin = get_admin_client()

    current_round = get_current_round(admin)

    reports = (
        admin.table("reports")
        .select("id, match_mentee_id, reported_by, message_id, kind, reason, created_at")
        .order("created_at", desc=True)
        .execute()
        .data
        or []
    )

    active_matches = (
        admin.table("matches")
        .select("mentor_user_id")
        .eq("status", "active")
        .execute()
        .data
        or []
    )
    active_count_by_mentor: dict[str, int] = {}
    for m in active_matches:
        active_count_by_mentor[m["mentor_user_id"]] = (
            active_count_by_mentor.get(m["mentor_user_id"], 0) + 1
        )

    mentors = (
        admin.table("mentor_profiles")
        .select("user_id, mentors_in, availability_count")
        .execute()
        .data
        or []
    )
    mentor_capacity = [
        {
            "user_id": m["user_id"],
            "mentors_in": m["mentors_in"],
            "capacity": m["availability_count"],
            "active_count": active_count_by_mentor.get(m["user_id"], 0),
        }
        for m in mentors
    ]

    return {
        "round": {"id": current_round["id"], "status": current_round["status"]},
        "reports": reports,
        "mentor_capacity": mentor_capacity,
    }
