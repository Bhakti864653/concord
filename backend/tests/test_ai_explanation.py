import pytest
from fastapi import HTTPException

from app import ai_explanation
from app.ai_explanation import build_deterministic_fallback, get_ai_explanation


class FakeQuery:
    def __init__(self, table_store, name):
        self._store = table_store
        self._name = name
        self._filters: dict = {}
        self._single = False

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def maybe_single(self):
        self._single = True
        return self

    def execute(self):
        rows = self._store.setdefault(self._name, [])
        matches = [r for r in rows if all(r.get(k) == v for k, v in self._filters.items())]
        self._result = (matches[0] if matches else None) if self._single else matches
        return self

    @property
    def data(self):
        return getattr(self, "_result", None)


class FakeAdminClient:
    def __init__(self, tables: dict[str, list[dict]]):
        self._tables = tables

    def table(self, name):
        return FakeQuery(self._tables, name)


def _base_tables():
    return {
        "matches": [
            {"id": "match-1", "mentee_user_id": "mentee-1", "mentor_user_id": "mentor-1"},
        ],
        "mentee_profiles": [
            {
                "user_id": "mentee-1",
                "seeking_guidance_on": "breaking into product management",
                "other_tag_text": "my very private secret",
                "circumstance_tags": ["first-gen"],
            }
        ],
        "mentor_profiles": [
            {
                "user_id": "mentor-1",
                "mentors_in": "product management coaching",
                "other_tag_text": None,
                "background_tags": ["first-gen"],
            }
        ],
    }


# --- authorization / cross-user access ---------------------------------


def test_get_ai_explanation_rejects_a_non_participant(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        get_ai_explanation("match-1", user_id="some-stranger")
    assert exc_info.value.status_code == 403


def test_get_ai_explanation_404s_for_unknown_match(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        get_ai_explanation("no-such-match", user_id="mentee-1")
    assert exc_info.value.status_code == 404


# --- deterministic narrative --------------------------------------------


def test_deterministic_fallback_mentions_a_shared_topic():
    text = build_deterministic_fallback(
        "breaking into product management",
        "product management coaching",
        shared_words=["product", "management"],
        shared_tags=["first-gen"],
    )
    assert "product" in text
    assert 3 <= text.count(".") <= 4


def test_get_ai_explanation_returns_the_deterministic_narrative(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    result = get_ai_explanation("match-1", user_id="mentee-1")

    assert "product" in result["explanation"]


def test_get_ai_explanation_falls_back_when_profile_context_is_missing(monkeypatch):
    tables = _base_tables()
    tables["mentee_profiles"] = []
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    result = get_ai_explanation("match-1", user_id="mentee-1")

    assert result == {
        "explanation": "You've been thoughtfully matched based on the goals and experience you each shared."
    }
