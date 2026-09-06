from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from .auth import get_user_id
from .supabase_client import get_admin_client

router = APIRouter()

# Shared lived-experience/circumstance vocabulary for both sides: a mentee
# picks what applies to them, a mentor can tag which of these are part of
# their own path (useful signal for matching later, e.g. a first-gen mentee
# paired with a first-gen mentor).
CIRCUMSTANCE_TAGS = [
    "first-gen",
    "career-switcher",
    "immigrant-background",
    "under-resourced-school-access",
]


class MenteeProfileIn(BaseModel):
    seeking_guidance_on: str = Field(min_length=1, max_length=200)
    circumstance_tags: list[str] = []
    other_tag_text: str | None = Field(default=None, max_length=200)
    bio: str = Field(min_length=1, max_length=2000)


class MentorProfileIn(BaseModel):
    mentors_in: str = Field(min_length=1, max_length=200)
    background: str = Field(min_length=1, max_length=2000)
    background_tags: list[str] = []
    other_tag_text: str | None = Field(default=None, max_length=200)
    availability_count: int = Field(ge=1, le=50)
    bio: str = Field(min_length=1, max_length=2000)


@router.post("/profiles/mentee")
def upsert_mentee_profile(
    body: MenteeProfileIn, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    tags = [t for t in body.circumstance_tags if t in CIRCUMSTANCE_TAGS]
    row = {
        "user_id": user_id,
        "seeking_guidance_on": body.seeking_guidance_on,
        "circumstance_tags": tags,
        "other_tag_text": body.other_tag_text,
        "bio": body.bio,
    }
    admin.table("mentee_profiles").upsert(row).execute()
    return {"status": "ok"}


@router.post("/profiles/mentor")
def upsert_mentor_profile(
    body: MentorProfileIn, authorization: str | None = Header(default=None)
):
    user_id = get_user_id(authorization)
    admin = get_admin_client()

    tags = [t for t in body.background_tags if t in CIRCUMSTANCE_TAGS]
    row = {
        "user_id": user_id,
        "mentors_in": body.mentors_in,
        "background": body.background,
        "background_tags": tags,
        "other_tag_text": body.other_tag_text,
        "availability_count": body.availability_count,
        "bio": body.bio,
    }
    admin.table("mentor_profiles").upsert(row).execute()
    return {"status": "ok"}
