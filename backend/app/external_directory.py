"""Where "potential mentors to invite" can come from.

Concord does not search the internet, scrape LinkedIn, directories, or social media, or import
real people. A suggestion can only come from a user's own invitation, from a clearly labeled
fictional demonstration entry, or - later - from an administrator-approved partner directory
whose participants consented to being listed. That last one would be another provider behind
the interface below; none exists today, and nothing here pretends otherwise.
"""

from dataclasses import asdict, dataclass
from typing import Protocol

from fastapi import APIRouter, Depends, Query

from .rate_limit import rate_limit

router = APIRouter()

DEMONSTRATION_LABEL = "Demonstration profile — not a real mentor."


@dataclass(frozen=True)
class ExternalMentorSearchQuery:
    text: str = ""
    limit: int = 6


@dataclass(frozen=True)
class ExternalMentorSuggestion:
    id: str
    display_name: str
    field: str
    summary: str
    source: str  # "demonstration" (or, in future, an approved directory's name)
    is_demonstration: bool
    label: str | None = None


class ExternalMentorDirectoryProvider(Protocol):
    name: str

    def search(self, query: ExternalMentorSearchQuery) -> list[ExternalMentorSuggestion]: ...


# Fictional people. No real names, photos, employers, or contact details.
_DEMO_ENTRIES = [
    ("demo-1", "Sample mentor: product design", "Product design",
     "Illustrates someone who could advise on moving into UX and product design."),
    ("demo-2", "Sample mentor: nursing", "Healthcare",
     "Illustrates someone who could share what nursing school and early shifts are like."),
    ("demo-3", "Sample mentor: software engineering", "Software",
     "Illustrates someone who could help with a first internship search in software."),
    ("demo-4", "Sample mentor: small business", "Entrepreneurship",
     "Illustrates someone who could talk through starting a small local business."),
]


class DemonstrationDirectoryProvider:
    """Local, fictional entries for development, tests, and the demo. Every entry is labeled."""

    name = "demonstration"

    def search(self, query: ExternalMentorSearchQuery) -> list[ExternalMentorSuggestion]:
        text = query.text.strip().lower()
        out = []
        for entry_id, display_name, field, summary in _DEMO_ENTRIES:
            if text and text not in f"{display_name} {field} {summary}".lower():
                continue
            out.append(
                ExternalMentorSuggestion(
                    id=entry_id,
                    display_name=display_name,
                    field=field,
                    summary=summary,
                    source=self.name,
                    is_demonstration=True,
                    label=DEMONSTRATION_LABEL,
                )
            )
        return out[: query.limit]


def get_provider() -> ExternalMentorDirectoryProvider:
    return DemonstrationDirectoryProvider()


@router.get("/mentors/potential")
def potential_mentors(
    q: str = Query(default="", max_length=80),
    _user_id: str = Depends(rate_limit("potential-mentors", max_calls=120, window_seconds=3600)),
):
    """Suggestions for people to *invite*. They carry no match score and can't be ranked."""
    provider = get_provider()
    suggestions = provider.search(ExternalMentorSearchQuery(text=q))
    return {"source": provider.name, "suggestions": [asdict(s) for s in suggestions]}
