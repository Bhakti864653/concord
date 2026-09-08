import pytest
from fastapi import HTTPException

from app import rounds
from app.rounds import _advance, _run_matching, get_current_round, require_preferences_open


class FakeQuery:
    def __init__(self, rows, on_insert=None, on_update=None):
        self._rows = rows
        self._filters: dict = {}
        self._order = None
        self._limit = None
        self._single = False
        self._on_insert = on_insert
        self._on_update = on_update

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def order(self, _column, desc=False):
        self._order = "desc" if desc else "asc"
        return self

    def limit(self, n):
        self._limit = n
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
        if self._order == "desc":
            matches = sorted(matches, key=lambda r: r.get("created_at", 0), reverse=True)
        if self._limit is not None:
            matches = matches[: self._limit]
        if self._single:
            return matches[0] if matches else None
        return matches


class FakeAdminClient:
    def __init__(self, tables: dict[str, list[dict]]):
        self._tables = tables
        self.round_updates: list[dict] = []
        self.round_inserts: list[dict] = []
        self.match_inserts: list[dict] = []

    def table(self, name):
        if name == "matching_rounds":
            return FakeQuery(
                self._tables.get("matching_rounds", []),
                on_insert=self.round_inserts.append,
                on_update=lambda row, _f: self.round_updates.append(row),
            )
        if name == "matches":
            return FakeQuery(
                self._tables.get("matches", []), on_insert=self.match_inserts.append
            )
        return FakeQuery(self._tables.get(name, []))


def test_get_current_round_returns_the_newest_row():
    fake = FakeAdminClient(
        {
            "matching_rounds": [
                {"id": "r1", "status": "results_available", "created_at": 1},
                {"id": "r2", "status": "preferences_open", "created_at": 2},
            ]
        }
    )
    assert get_current_round(fake)["id"] == "r2"


def test_get_current_round_raises_when_none_exists():
    fake = FakeAdminClient({"matching_rounds": []})
    with pytest.raises(HTTPException) as exc_info:
        get_current_round(fake)
    assert exc_info.value.status_code == 500


def test_require_preferences_open_passes_when_open():
    fake = FakeAdminClient(
        {"matching_rounds": [{"id": "r1", "status": "preferences_open", "created_at": 1}]}
    )
    require_preferences_open(fake)  # should not raise


def test_require_preferences_open_rejects_when_locked():
    fake = FakeAdminClient(
        {"matching_rounds": [{"id": "r1", "status": "preferences_locked", "created_at": 1}]}
    )
    with pytest.raises(HTTPException) as exc_info:
        require_preferences_open(fake)
    assert exc_info.value.status_code == 409


def test_run_matching_excludes_already_actively_matched_mentees():
    fake = FakeAdminClient(
        {
            "matches": [
                {"mentee_user_id": "mentee-already", "mentor_user_id": "mentor-1", "status": "active"}
            ],
            "mentee_preferences": [
                {"user_id": "mentee-already", "ranked_mentor_ids": ["mentor-1"], "locked": True},
                {"user_id": "mentee-new", "ranked_mentor_ids": ["mentor-1"], "locked": True},
            ],
            "mentor_preferences": [
                {
                    "user_id": "mentor-1",
                    "ranked_mentee_ids": ["mentee-new", "mentee-already"],
                    "locked": True,
                }
            ],
            "mentor_profiles": [{"user_id": "mentor-1", "availability_count": 2}],
        }
    )

    result = _run_matching(fake)

    # mentor-1 has capacity 2, already has 1 active match -> 1 free slot,
    # which should go to mentee-new (mentee-already is skipped entirely).
    assert result == {"newly_matched_count": 1, "still_waitlisted_count": 0}
    assert fake.match_inserts == [[{"mentee_user_id": "mentee-new", "mentor_user_id": "mentor-1"}]]


def test_run_matching_respects_reduced_mentor_capacity():
    fake = FakeAdminClient(
        {
            "matches": [
                {"mentee_user_id": "mentee-a", "mentor_user_id": "mentor-1", "status": "active"},
                {"mentee_user_id": "mentee-b", "mentor_user_id": "mentor-1", "status": "active"},
            ],
            "mentee_preferences": [
                {"user_id": "mentee-c", "ranked_mentor_ids": ["mentor-1"], "locked": True},
            ],
            "mentor_preferences": [
                {"user_id": "mentor-1", "ranked_mentee_ids": ["mentee-c"], "locked": True}
            ],
            "mentor_profiles": [{"user_id": "mentor-1", "availability_count": 2}],
        }
    )

    result = _run_matching(fake)

    # mentor-1's capacity (2) is already fully used by 2 active matches.
    assert result == {"newly_matched_count": 0, "still_waitlisted_count": 1}
    assert fake.match_inserts == []


def test_advance_from_preferences_open_locks_preferences():
    fake = FakeAdminClient({"matching_rounds": []})
    result = _advance(fake, {"id": "r1", "status": "preferences_open"})
    assert result == {"status": "preferences_locked"}
    assert fake.round_updates[0]["status"] == "preferences_locked"


def test_advance_from_preferences_locked_starts_matching():
    fake = FakeAdminClient({"matching_rounds": []})
    result = _advance(fake, {"id": "r1", "status": "preferences_locked"})
    assert result == {"status": "matching_in_progress"}


def test_advance_from_matching_in_progress_runs_matching_and_publishes_results():
    fake = FakeAdminClient(
        {
            "matches": [],
            "mentee_preferences": [
                {"user_id": "mentee-1", "ranked_mentor_ids": ["mentor-1"], "locked": True}
            ],
            "mentor_preferences": [
                {"user_id": "mentor-1", "ranked_mentee_ids": ["mentee-1"], "locked": True}
            ],
            "mentor_profiles": [{"user_id": "mentor-1", "availability_count": 1}],
        }
    )
    result = _advance(fake, {"id": "r1", "status": "matching_in_progress"})
    assert result["status"] == "results_available"
    assert result["newly_matched_count"] == 1
    assert fake.match_inserts == [[{"mentee_user_id": "mentee-1", "mentor_user_id": "mentor-1"}]]


def test_advance_from_results_available_starts_a_fresh_round():
    fake = FakeAdminClient({"matching_rounds": []})
    result = _advance(fake, {"id": "r1", "status": "results_available"})
    assert result == {"status": "preferences_open"}
    assert fake.round_inserts == [{"status": "preferences_open"}]
