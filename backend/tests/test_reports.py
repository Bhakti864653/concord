import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app import reports
from app.reports import ReportIn


def test_report_in_rejects_unknown_kind():
    with pytest.raises(ValidationError):
        ReportIn(kind="shout", reason="loud")


def test_report_in_rejects_blank_reason():
    with pytest.raises(ValidationError):
        ReportIn(kind="report", reason="   ")


def test_report_in_trims_reason():
    body = ReportIn(kind="report", reason="  spam  ")
    assert body.reason == "spam"


class FakeQuery:
    def __init__(self, rows, on_insert=None, on_update=None):
        self._rows = rows
        self._filters: dict = {}
        self._single = False
        self._on_insert = on_insert
        self._on_update = on_update

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def maybe_single(self):
        self._single = True
        return self

    def insert(self, row):
        if self._on_insert:
            self._on_insert(row)
        return self

    def update(self, row):
        if self._on_update:
            self._on_update(row, self._filters)
        return self

    def execute(self):
        return self

    @property
    def data(self):
        matches = [
            r for r in self._rows if all(r.get(k) == v for k, v in self._filters.items())
        ]
        if self._single:
            return matches[0] if matches else None
        return matches


class FakeAdminClient:
    def __init__(self, match: dict | None, messages: list[dict] | None = None):
        self.match = dict(match) if match else None
        self.messages = messages or []
        self.inserted_reports: list[dict] = []
        self.match_updates: list[dict] = []

    def table(self, name):
        if name == "matches":
            rows = [self.match] if self.match else []
            return FakeQuery(rows, on_update=self._update_match)
        if name == "messages":
            return FakeQuery(self.messages)
        if name == "reports":
            return FakeQuery([], on_insert=self.inserted_reports.append)
        raise AssertionError(f"unexpected table {name}")

    def _update_match(self, row, _filters):
        self.match.update(row)
        self.match_updates.append(row)


def _match():
    return {"mentee_user_id": "mentee-1", "mentor_user_id": "mentor-1", "status": "active"}


def test_submit_report_rejects_a_non_participant(monkeypatch):
    fake = FakeAdminClient(_match())
    monkeypatch.setattr(reports, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        reports.submit_report(
            "mentee-1", ReportIn(kind="report", reason="spam"), user_id="stranger"
        )
    assert exc_info.value.status_code == 403


def test_submit_report_rejects_a_message_from_a_different_match(monkeypatch):
    fake = FakeAdminClient(
        _match(), messages=[{"id": "msg-1", "match_mentee_id": "some-other-match"}]
    )
    monkeypatch.setattr(reports, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        reports.submit_report(
            "mentee-1",
            ReportIn(kind="report", reason="rude", message_id="msg-1"),
            user_id="mentee-1",
        )
    assert exc_info.value.status_code == 400


def test_submit_report_of_kind_report_does_not_end_the_match(monkeypatch):
    fake = FakeAdminClient(_match())
    monkeypatch.setattr(reports, "get_admin_client", lambda: fake)

    result = reports.submit_report(
        "mentee-1", ReportIn(kind="report", reason="spam"), user_id="mentee-1"
    )

    assert result == {"status": "ok", "match_ended": False}
    assert fake.match["status"] == "active"
    assert fake.inserted_reports[0]["kind"] == "report"


def test_submit_report_of_kind_block_ends_the_match(monkeypatch):
    fake = FakeAdminClient(_match())
    monkeypatch.setattr(reports, "get_admin_client", lambda: fake)

    result = reports.submit_report(
        "mentee-1", ReportIn(kind="block", reason="uncomfortable"), user_id="mentor-1"
    )

    assert result == {"status": "ok", "match_ended": True}
    assert fake.match["status"] == "ended"


def test_submit_report_of_kind_emergency_end_ends_the_match(monkeypatch):
    fake = FakeAdminClient(_match())
    monkeypatch.setattr(reports, "get_admin_client", lambda: fake)

    result = reports.submit_report(
        "mentee-1",
        ReportIn(kind="emergency_end", reason="unsafe"),
        user_id="mentee-1",
    )

    assert result == {"status": "ok", "match_ended": True}
    assert fake.match["status"] == "ended"


def test_submit_report_message_scoped_report_logs_message_id(monkeypatch):
    fake = FakeAdminClient(
        _match(), messages=[{"id": "msg-1", "match_mentee_id": "mentee-1"}]
    )
    monkeypatch.setattr(reports, "get_admin_client", lambda: fake)

    reports.submit_report(
        "mentee-1",
        ReportIn(kind="report", reason="rude", message_id="msg-1"),
        user_id="mentee-1",
    )

    assert fake.inserted_reports[0]["message_id"] == "msg-1"
