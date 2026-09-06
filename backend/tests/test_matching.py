import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app import matching
from app.matching import PreferencesIn, _jaccard, _save_preferences, _tokenize, score_pair


def test_tokenize_lowercases_and_drops_stopwords():
    assert _tokenize("Breaking into Product Management") == {
        "breaking",
        "product",
        "management",
    }


def test_tokenize_combines_multiple_texts():
    assert _tokenize("hello world", "world peace") == {"hello", "world", "peace"}


def test_tokenize_ignores_none():
    assert _tokenize("hello", None) == {"hello"}


def test_jaccard_identical_sets_is_one():
    assert _jaccard({"a", "b"}, {"a", "b"}) == 1.0


def test_jaccard_disjoint_sets_is_zero():
    assert _jaccard({"a"}, {"b"}) == 0.0


def test_jaccard_both_empty_is_zero():
    assert _jaccard(set(), set()) == 0.0


def test_jaccard_partial_overlap():
    # {a} intersection over {a,b} union -> 1/2
    assert _jaccard({"a"}, {"a", "b"}) == 0.5


def test_score_pair_no_overlap_is_zero():
    score = score_pair(
        "breaking into product management",
        None,
        [],
        "learning to paint watercolors",
        None,
        [],
    )
    assert score == 0.0


def test_score_pair_full_text_and_tag_overlap_is_one():
    score = score_pair(
        "product management",
        None,
        ["first-gen"],
        "product management",
        None,
        ["first-gen"],
    )
    assert score == 1.0


def test_score_pair_weights_text_over_tags():
    # Full text overlap, no tag overlap: 0.7*1 + 0.3*0 = 0.7
    text_only = score_pair(
        "product management", None, [], "product management", None, ["first-gen"]
    )
    assert text_only == 0.7

    # No text overlap, full tag overlap: 0.7*0 + 0.3*1 = 0.3
    tags_only = score_pair(
        "product management",
        None,
        ["first-gen"],
        "watercolor painting",
        None,
        ["first-gen"],
    )
    assert tags_only == 0.3


def test_score_pair_other_tag_text_folds_into_text_overlap():
    score = score_pair(
        "guidance", "robotics", [], "guidance", "robotics", []
    )
    assert score == 0.7


def test_preferences_in_rejects_duplicate_ranked_ids():
    with pytest.raises(ValidationError):
        PreferencesIn(ranked_ids=["a", "b", "a"])


class FakeTable:
    def __init__(self, rows):
        self._rows = rows
        self.upserted = None

    def select(self, *_args, **_kwargs):
        return self

    def execute(self):
        return self

    @property
    def data(self):
        return self._rows

    def upsert(self, row):
        self.upserted = row
        return self


class FakeAdminClient:
    def __init__(self, other_table_rows):
        self._other_table_rows = other_table_rows
        self.saved_table = None

    def table(self, name):
        if name == "mentor_profiles" or name == "mentee_profiles":
            table = FakeTable(self._other_table_rows)
        else:
            table = FakeTable([])
            self.saved_table = table
        return table


def test_save_preferences_rejects_an_unknown_profile_id(monkeypatch):
    fake = FakeAdminClient(other_table_rows=[{"user_id": "real-mentor"}])
    monkeypatch.setattr(matching, "get_admin_client", lambda: fake)

    body = PreferencesIn(ranked_ids=["real-mentor", "made-up-id"])
    with pytest.raises(HTTPException) as exc_info:
        _save_preferences(
            "mentee_preferences", "ranked_mentor_ids", "mentor_profiles", "u1", body
        )
    assert exc_info.value.status_code == 400
    assert "made-up-id" in exc_info.value.detail


def test_save_preferences_writes_the_ranked_list_keyed_by_caller(monkeypatch):
    fake = FakeAdminClient(other_table_rows=[{"user_id": "real-mentor"}])
    monkeypatch.setattr(matching, "get_admin_client", lambda: fake)

    body = PreferencesIn(ranked_ids=["real-mentor"], locked=True)
    _save_preferences(
        "mentee_preferences", "ranked_mentor_ids", "mentor_profiles", "u1", body
    )

    assert fake.saved_table.upserted == {
        "user_id": "u1",
        "ranked_mentor_ids": ["real-mentor"],
        "locked": True,
    }
