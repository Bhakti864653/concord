import pytest
from fastapi import HTTPException

from app import match_explanation
from app.match_explanation import _rank_of, match_explanation as match_explanation_endpoint


def test_rank_of_returns_one_indexed_position():
    assert _rank_of(["a", "b", "c"], "b") == 2


def test_rank_of_none_when_not_ranked():
    assert _rank_of(["a", "b"], "z") is None


def test_rank_of_none_when_list_missing():
    assert _rank_of(None, "a") is None


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows
        self._filters: dict = {}

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def maybe_single(self):
        self._single = True
        return self

    def execute(self):
        return self

    @property
    def data(self):
        matches = [
            r for r in self._rows if all(r.get(k) == v for k, v in self._filters.items())
        ]
        if getattr(self, "_single", False):
            return matches[0] if matches else None
        return matches


class FakeAdminClient:
    def __init__(self, tables: dict[str, list[dict]]):
        self._tables = tables

    def table(self, name):
        return FakeQuery(self._tables.get(name, []))


def _base_tables():
    return {
        "matches": [
            {"id": "match-1", "mentee_user_id": "mentee-1", "mentor_user_id": "mentor-1", "status": "active"},
            {"id": "match-2", "mentee_user_id": "mentee-2", "mentor_user_id": "mentor-1", "status": "active"},
        ],
        "mentee_profiles": [
            {
                "user_id": "mentee-1",
                "seeking_guidance_on": "product management",
                "other_tag_text": None,
                "circumstance_tags": ["first-gen"],
            }
        ],
        "mentor_profiles": [
            {
                "user_id": "mentor-1",
                "mentors_in": "product management coaching",
                "other_tag_text": None,
                "background_tags": ["first-gen"],
                "availability_count": 2,
            }
        ],
        "mentee_preferences": [
            {"user_id": "mentee-1", "ranked_mentor_ids": ["mentor-1", "mentor-2"]}
        ],
        "mentor_preferences": [
            {"user_id": "mentor-1", "ranked_mentee_ids": ["mentee-2", "mentee-1"]}
        ],
    }


def test_match_explanation_rejects_a_non_participant(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(match_explanation, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        match_explanation_endpoint("match-1", user_id="some-stranger")
    assert exc_info.value.status_code == 403


def test_match_explanation_computes_ranks_reasons_and_capacity(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(match_explanation, "get_admin_client", lambda: fake)

    result = match_explanation_endpoint("match-1", user_id="mentee-1")

    assert result["shared_words"] == ["management", "product"]
    assert result["shared_tags"] == ["first-gen"]
    assert result["mentee_rank_of_mentor"] == 1
    assert result["mentor_rank_of_mentee"] == 2
    assert result["mentor_capacity"] == 2
    assert result["mentor_matched_count"] == 2
