from app import profiles


class FakeTable:
    def __init__(self, store: dict):
        self.store = store
        self.last_row = None

    def upsert(self, row):
        self.last_row = row
        self.store[row["user_id"]] = row
        return self

    def execute(self):
        return self


class FakeAdminClient:
    def __init__(self):
        self.store: dict = {}
        self.tables: dict[str, FakeTable] = {}

    def table(self, name):
        self.tables.setdefault(name, FakeTable(self.store))
        return self.tables[name]


def test_upsert_mentee_profile_writes_row_keyed_by_caller(monkeypatch):
    fake = FakeAdminClient()
    monkeypatch.setattr(profiles, "get_admin_client", lambda: fake)

    body = profiles.MenteeProfileIn(
        seeking_guidance_on="breaking into product management",
        circumstance_tags=["first-gen"],
        other_tag_text=None,
        bio="Hi there.",
    )
    result = profiles.upsert_mentee_profile(body, user_id="u1")

    assert result == {"status": "ok"}
    row = fake.tables["mentee_profiles"].last_row
    assert row["user_id"] == "u1"
    assert row["circumstance_tags"] == ["first-gen"]


def test_upsert_mentee_profile_drops_tags_outside_the_allowed_vocabulary(monkeypatch):
    # A direct API call (bypassing the frontend's checkbox list) shouldn't be
    # able to write an arbitrary tag string into the DB.
    fake = FakeAdminClient()
    monkeypatch.setattr(profiles, "get_admin_client", lambda: fake)

    body = profiles.MenteeProfileIn(
        seeking_guidance_on="x",
        circumstance_tags=["first-gen", "<script>alert(1)</script>", "made-up-tag"],
        other_tag_text=None,
        bio="x",
    )
    profiles.upsert_mentee_profile(body, user_id="u1")

    row = fake.tables["mentee_profiles"].last_row
    assert row["circumstance_tags"] == ["first-gen"]


def test_upsert_mentor_profile_writes_row_keyed_by_caller(monkeypatch):
    fake = FakeAdminClient()
    monkeypatch.setattr(profiles, "get_admin_client", lambda: fake)

    body = profiles.MentorProfileIn(
        mentors_in="product management",
        background="10 years in PM",
        background_tags=["career-switcher"],
        other_tag_text=None,
        availability_count=3,
        bio="Happy to help.",
    )
    result = profiles.upsert_mentor_profile(body, user_id="u2")

    assert result == {"status": "ok"}
    row = fake.tables["mentor_profiles"].last_row
    assert row["user_id"] == "u2"
    assert row["availability_count"] == 3


def test_upsert_mentor_profile_drops_tags_outside_the_allowed_vocabulary(monkeypatch):
    fake = FakeAdminClient()
    monkeypatch.setattr(profiles, "get_admin_client", lambda: fake)

    body = profiles.MentorProfileIn(
        mentors_in="x",
        background="x",
        background_tags=["not-a-real-tag"],
        other_tag_text=None,
        availability_count=1,
        bio="x",
    )
    profiles.upsert_mentor_profile(body, user_id="u2")

    row = fake.tables["mentor_profiles"].last_row
    assert row["background_tags"] == []
