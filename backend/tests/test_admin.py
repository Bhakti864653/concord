from app import admin


class FakeQuery:
    def __init__(self, rows):
        self._rows = rows
        self._filters: dict = {}
        self._order = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def order(self, _column, desc=False):
        self._order = "desc" if desc else "asc"
        return self

    def limit(self, n):
        self._rows = self._rows[:n]
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
        return matches


class FakeAdminClient:
    def __init__(self, tables: dict[str, list[dict]]):
        self._tables = tables

    def table(self, name):
        return FakeQuery(self._tables.get(name, []))


def test_admin_dashboard_assembles_round_reports_and_capacity(monkeypatch):
    fake = FakeAdminClient(
        {
            "matching_rounds": [{"id": "r1", "status": "preferences_open", "created_at": 1}],
            "reports": [
                {
                    "id": "rep-1",
                    "match_id": "match-1",
                    "reported_by": "mentee-1",
                    "message_id": None,
                    "kind": "report",
                    "reason": "spam",
                    "created_at": 2,
                },
            ],
            "matches": [
                {"mentor_user_id": "mentor-1", "status": "active"},
                {"mentor_user_id": "mentor-1", "status": "active"},
                {"mentor_user_id": "mentor-2", "status": "active"},
            ],
            "mentor_profiles": [
                {"user_id": "mentor-1", "mentors_in": "product management", "availability_count": 3},
                {"user_id": "mentor-2", "mentors_in": "engineering", "availability_count": 1},
            ],
        }
    )
    monkeypatch.setattr(admin, "get_admin_client", lambda: fake)
    # admin_dashboard calls require_admin(authorization) itself, which needs
    # a real env var + token - bypass that by monkeypatching it directly.
    monkeypatch.setattr(admin, "require_admin", lambda _auth: "admin-id")

    result = admin.admin_dashboard(authorization="Bearer whatever")

    assert result["round"] == {"id": "r1", "status": "preferences_open"}
    assert result["reports"] == [
        {
            "id": "rep-1",
            "match_id": "match-1",
            "reported_by": "mentee-1",
            "message_id": None,
            "kind": "report",
            "reason": "spam",
            "created_at": 2,
        }
    ]
    assert result["mentor_capacity"] == [
        {"user_id": "mentor-1", "mentors_in": "product management", "capacity": 3, "active_count": 2},
        {"user_id": "mentor-2", "mentors_in": "engineering", "capacity": 1, "active_count": 1},
    ]
