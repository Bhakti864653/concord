import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app import rematch
from app.rematch import RematchRequestIn


def test_rematch_request_in_rejects_unknown_reason():
    with pytest.raises(ValidationError):
        RematchRequestIn(reason="just felt like it")


def test_rematch_request_in_accepts_a_known_reason():
    body = RematchRequestIn(reason="availability_conflict")
    assert body.reason == "availability_conflict"


class FakeMatchesTable:
    def __init__(self, match: dict | None):
        self._match = match
        self.updated = None
        self._filters: dict = {}

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def maybe_single(self):
        return self

    def update(self, row):
        self.updated = row
        return self

    def execute(self):
        return self

    @property
    def data(self):
        if self._match and self._filters.get("mentee_user_id") == self._match["mentee_user_id"]:
            return self._match
        return None


class FakeRematchRequestsTable:
    def __init__(self):
        self.inserted = None

    def insert(self, row):
        self.inserted = row
        return self

    def execute(self):
        return self


class FakeAdminClient:
    def __init__(self, match: dict | None):
        self.matches = FakeMatchesTable(match)
        self.rematch_requests = FakeRematchRequestsTable()

    def table(self, name):
        if name == "matches":
            return self.matches
        if name == "rematch_requests":
            return self.rematch_requests
        raise AssertionError(f"unexpected table {name}")


def test_request_rematch_rejects_a_non_participant(monkeypatch):
    fake = FakeAdminClient(
        {"mentee_user_id": "mentee-1", "mentor_user_id": "mentor-1", "status": "active"}
    )
    monkeypatch.setattr(rematch, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        rematch.request_rematch(
            "mentee-1",
            RematchRequestIn(reason="goals_changed"),
            user_id="some-stranger",
        )
    assert exc_info.value.status_code == 403
    assert fake.matches.updated is None


def test_request_rematch_rejects_an_already_ended_match(monkeypatch):
    fake = FakeAdminClient(
        {"mentee_user_id": "mentee-1", "mentor_user_id": "mentor-1", "status": "ended"}
    )
    monkeypatch.setattr(rematch, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        rematch.request_rematch(
            "mentee-1",
            RematchRequestIn(reason="goals_changed"),
            user_id="mentee-1",
        )
    assert exc_info.value.status_code == 409


def test_request_rematch_ends_the_match_and_logs_the_reason_privately(monkeypatch):
    fake = FakeAdminClient(
        {"mentee_user_id": "mentee-1", "mentor_user_id": "mentor-1", "status": "active"}
    )
    monkeypatch.setattr(rematch, "get_admin_client", lambda: fake)

    result = rematch.request_rematch(
        "mentee-1",
        RematchRequestIn(reason="mentor_unresponsive"),
        user_id="mentor-1",
    )

    assert result == {"status": "ended"}
    assert fake.matches.updated["status"] == "ended"
    assert "ended_at" in fake.matches.updated
    assert fake.rematch_requests.inserted == {
        "match_mentee_id": "mentee-1",
        "requested_by": "mentor-1",
        "reason": "mentor_unresponsive",
    }
