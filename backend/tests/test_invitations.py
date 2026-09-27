"""External mentor discovery and consent-based invitations: "open enrollment, closed matching"."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import invitations, matching, participation, rate_limit, rounds
from app.eligibility import IneligibleMatchingInput, guard_matching_inputs, is_mentor_eligible
from app.external_directory import (
    DEMONSTRATION_LABEL,
    DemonstrationDirectoryProvider,
    ExternalMentorSearchQuery,
)
from app.gale_shapley import run_gale_shapley
from app.invitations import ClaimIn, ConfirmIn, InvitationIn, hash_token

NOW = datetime.now(timezone.utc)
EARLIER = (NOW - timedelta(days=30)).isoformat()


# --- an in-memory stand-in for the Supabase client -------------------------------------------


class Query:
    def __init__(self, db, name):
        self.db, self.name = db, name
        self.filters: list[tuple[str, object]] = []
        self.op, self.payload, self._order, self._single = "select", None, None, False

    def select(self, *_a, **_k):
        return self

    def eq(self, column, value):
        self.filters.append((column, value))
        return self

    def order(self, column, desc=False):
        self._order = (column, desc)
        return self

    def limit(self, _n):
        return self

    def maybe_single(self):
        self._single = True
        return self

    def insert(self, row):
        self.op, self.payload = "insert", row
        return self

    def update(self, row):
        self.op, self.payload = "update", row
        return self

    def upsert(self, row):
        self.op, self.payload = "upsert", row
        return self

    def _match(self, row):
        return all(row.get(c) == v for c, v in self.filters)

    def execute(self):
        rows = self.db.tables.setdefault(self.name, [])
        if self.op == "insert":
            new = self.payload if isinstance(self.payload, list) else [self.payload]
            stored = []
            for r in new:
                r = {"id": f"{self.name}-{len(rows) + 1}", "created_at": NOW.isoformat(), **r}
                rows.append(r)
                stored.append(r)
            self.data = stored
        elif self.op == "update":
            hit = [r for r in rows if self._match(r)]
            for r in hit:
                r.update(self.payload)
            self.data = hit
        elif self.op == "upsert":
            rows.append(self.payload)
            self.data = [self.payload]
        else:
            data = [dict(r) for r in rows if self._match(r)]
            if self._order:
                col, desc = self._order
                data.sort(key=lambda r: str(r.get(col, "")), reverse=desc)
            self.data = (data[0] if data else None) if self._single else data
        return self


class FakeDB:
    def __init__(self, **tables):
        self.tables = {k: list(v) for k, v in tables.items()}

    def table(self, name):
        return Query(self, name)


def open_round(**extra):
    return {"id": "round-1", "status": "preferences_open", "created_at": EARLIER, "locked_at": None, **extra}


def mentor(user_id, **overrides):
    row = {
        "user_id": user_id,
        "mentors_in": "product design",
        "background": "Designer for ten years",
        "bio": "Happy to help",
        "background_tags": [],
        "availability_count": 2,
        "onboarding_completed_at": EARLIER,
        "visible_to_mentees": True,
        "matching_opted_in_at": EARLIER,
        "suspended_at": None,
    }
    row.update(overrides)
    return row


def mentee(user_id):
    return {"user_id": user_id, "seeking_guidance_on": "product design", "bio": "Hi",
            "circumstance_tags": []}


def user(user_id, role):
    return SimpleNamespace(id=user_id, user_metadata={"user_type": role})


@pytest.fixture
def db(monkeypatch):
    fake = FakeDB(
        matching_rounds=[open_round()],
        mentor_profiles=[mentor("mentor-ok")],
        mentee_profiles=[mentee("mentee-1")],
        matches=[],
        reports=[],
        mentor_invitations=[],
        availability=[],
    )
    for module in (matching, invitations, participation, rounds):
        monkeypatch.setattr(module, "get_admin_client", lambda: fake, raising=False)
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret")
    return fake


def make_invitation(db, inviter="mentee-1", **fields):
    draft = invitations.create_draft(
        db, inviter,
        InvitationIn(safe_display_name="Ms. Rivera", legitimate_reason_confirmed=True, **fields),
    )
    link = invitations.confirm(db, inviter, draft["id"], ConfirmIn(understands_not_a_match=True))
    return draft["id"], link["link_path"].removeprefix(invitations.LINK_PATH)


# --- who can be scored, ranked, and matched ---------------------------------------------------


def test_registered_eligible_mentor_enters_preference_scoring(db):
    result = matching.suggested_mentors(user_id="mentee-1")
    assert [m["user_id"] for m in result["mentors"]] == ["mentor-ok"]
    assert "score" in result["mentors"][0]


def test_external_suggestion_cannot_enter_scoring_or_ranking(db):
    make_invitation(db)
    demo = DemonstrationDirectoryProvider().search(ExternalMentorSearchQuery())
    scored = {m["user_id"] for m in matching.suggested_mentors(user_id="mentee-1")["mentors"]}
    invitation_ids = {r["id"] for r in db.tables["mentor_invitations"]}
    assert scored.isdisjoint(invitation_ids | {s.id for s in demo})

    body = matching.PreferencesIn(ranked_ids=["mentor-ok", demo[0].id])
    with pytest.raises(HTTPException) as err:
        matching._save_preferences(
            "mentee_preferences", "ranked_mentor_ids", "mentor_profiles", "mentee-1", body
        )
    assert err.value.status_code == 400


def test_demonstration_entries_are_labeled_and_carry_no_score():
    for s in DemonstrationDirectoryProvider().search(ExternalMentorSearchQuery()):
        assert s.is_demonstration and s.label == DEMONSTRATION_LABEL
        assert not hasattr(s, "score")


def _locked_prefs(db, ranked):
    db.tables["mentee_preferences"] = [
        {"user_id": "mentee-1", "ranked_mentor_ids": ranked, "locked": True}
    ]
    db.tables["mentor_preferences"] = [
        {"user_id": m["user_id"], "ranked_mentee_ids": ["mentee-1"], "locked": True}
        for m in db.tables["mentor_profiles"]
    ]


def test_invitation_record_cannot_enter_gale_shapley(db):
    invitation_id, _ = make_invitation(db)
    _locked_prefs(db, [invitation_id])
    result = rounds._run_matching(db, open_round())
    assert result["newly_matched_count"] == 0
    assert db.tables["matches"] == []
    with pytest.raises(IneligibleMatchingInput):
        guard_matching_inputs({"mentee-1": [invitation_id]}, {}, {}, {"mentor-ok"})


@pytest.mark.parametrize(
    "overrides",
    [
        {"onboarding_completed_at": None},  # incomplete
        {"matching_opted_in_at": None},  # has not opted in
        {"visible_to_mentees": False},  # no consent to be shown
        {"suspended_at": EARLIER},  # suspended
    ],
)
def test_incomplete_unconsented_or_suspended_mentor_cannot_enter_matching(db, overrides):
    db.tables["mentor_profiles"] = [mentor("mentor-x", **overrides)]
    _locked_prefs(db, ["mentor-x"])
    assert rounds._run_matching(db, open_round())["newly_matched_count"] == 0
    assert matching.suggested_mentors(user_id="mentee-1")["mentors"] == []


def test_mentor_with_zero_remaining_capacity_gets_no_new_match(db):
    db.tables["mentor_profiles"] = [mentor("mentor-full", availability_count=1)]
    db.tables["matches"] = [
        {"id": "m0", "mentee_user_id": "other", "mentor_user_id": "mentor-full", "status": "active"}
    ]
    _locked_prefs(db, ["mentor-full"])
    assert rounds._run_matching(db, open_round())["newly_matched_count"] == 0
    with pytest.raises(IneligibleMatchingInput):
        guard_matching_inputs({}, {"mentor-full": []}, {"mentor-full": 0}, {"mentor-full"})


def test_eligible_pair_still_matches_normally(db):
    _locked_prefs(db, ["mentor-ok"])
    assert rounds._run_matching(db, open_round())["newly_matched_count"] == 1


def test_gale_shapley_itself_is_unchanged():
    assert run_gale_shapley({"a": ["x"]}, {"x": ["a"]}, {"x": 1}) == {"a": "x"}


# --- the invitation lifecycle -----------------------------------------------------------------


def test_raw_tokens_are_never_stored(db):
    _, raw = make_invitation(db, email="rivera@example.com")
    stored = db.tables["mentor_invitations"][0]
    assert raw not in str(stored.values())
    assert stored["token_hash"] == hash_token(raw)
    assert "rivera@example.com" not in str(stored.values())
    assert len(raw) >= 40


def test_valid_invitation_can_be_opened_and_marks_opened(db):
    _, raw = make_invitation(db, invitation_message="You helped me a lot.")
    page = invitations.resolve_public(db, raw)
    assert page["invitation_message"] == "You helped me a lot."
    assert "inviter_user_id" not in page and "email" not in str(page)
    assert db.tables["mentor_invitations"][0]["status"] == "opened"


def test_invalid_token_reveals_nothing(db):
    make_invitation(db)
    with pytest.raises(HTTPException) as err:
        invitations.resolve_public(db, "not-a-real-token-at-all")
    assert err.value.status_code == 404
    assert err.value.detail == invitations.INVALID_LINK


def test_expired_invitation_cannot_be_opened_or_claimed(db):
    _, raw = make_invitation(db)
    db.tables["mentor_invitations"][0]["expires_at"] = (NOW - timedelta(seconds=1)).isoformat()
    with pytest.raises(HTTPException) as err:
        invitations.claim(db, user("new-mentor", "mentor"), raw)
    assert err.value.detail == invitations.INVALID_LINK
    with pytest.raises(HTTPException):
        invitations.resolve_public(db, raw)
    assert db.tables["mentor_invitations"][0]["status"] == "expired"


def test_revoked_invitation_cannot_be_claimed(db):
    invitation_id, raw = make_invitation(db)
    invitations.revoke(db, "mentee-1", invitation_id)
    with pytest.raises(HTTPException) as err:
        invitations.claim(db, user("new-mentor", "mentor"), raw)
    assert err.value.status_code == 404


def test_token_cannot_be_used_twice(db):
    _, raw = make_invitation(db)
    assert invitations.claim(db, user("new-mentor", "mentor"), raw)["status"] == "accepted"
    with pytest.raises(HTTPException):
        invitations.claim(db, user("someone-else", "mentor"), raw)
    assert db.tables["mentor_invitations"][0]["claimed_by_user_id"] == "new-mentor"


def test_concurrent_second_claim_is_refused(db):
    """If the token is consumed between the check and the write, the write matches nothing."""
    _, raw = make_invitation(db)
    row = dict(db.tables["mentor_invitations"][0])
    db.tables["mentor_invitations"][0]["token_hash"] = None  # the other request won
    with pytest.raises(HTTPException):
        invitations._consume(db, row, {"status": "accepted"})


def test_claiming_creates_no_match_and_no_preferences(db):
    _, raw = make_invitation(db)
    db.tables["mentor_preferences"] = []
    db.tables["mentee_preferences"] = []
    invitations.claim(db, user("new-mentor", "mentor"), raw)
    assert db.tables["matches"] == []
    assert db.tables["mentor_preferences"] == [] and db.tables["mentee_preferences"] == []
    assert not any(p["user_id"] == "new-mentor" for p in db.tables["mentor_profiles"])


def test_only_mentor_accounts_can_claim_and_not_the_inviter(db):
    _, raw = make_invitation(db, inviter="mentor-ok")
    with pytest.raises(HTTPException) as err:
        invitations.claim(db, user("mentee-2", "mentee"), raw)
    assert err.value.status_code == 403
    with pytest.raises(HTTPException):
        invitations.claim(db, user("mentor-ok", "mentor"), raw)


def test_declining_needs_no_account_and_ends_the_link(db):
    _, raw = make_invitation(db)
    assert invitations.decline_public(db, raw)["status"] == "declined"
    with pytest.raises(HTTPException):
        invitations.resolve_public(db, raw)


def test_one_user_cannot_view_or_revoke_another_users_invitation(db):
    invitation_id, _ = make_invitation(db, inviter="mentee-1")
    assert invitations.list_for_inviter(db, "intruder") == []
    with pytest.raises(HTTPException) as err:
        invitations.revoke(db, "intruder", invitation_id)
    assert err.value.status_code == 404
    with pytest.raises(HTTPException):
        invitations.new_link(db, "intruder", invitation_id)


def test_inviter_view_hides_hashes_and_claimer(db):
    make_invitation(db, email="x@example.com")
    invitations.claim(db, user("new-mentor", "mentor"), _new_raw(db))
    visible = invitations.list_for_inviter(db, "mentee-1")[0]
    for hidden in ("token_hash", "invited_email_hash", "claimed_by_user_id", "inviter_user_id"):
        assert hidden not in visible


def _new_raw(db):
    return invitations.new_link(db, "mentee-1", db.tables["mentor_invitations"][0]["id"])[
        "link_path"
    ].removeprefix(invitations.LINK_PATH)


def test_new_link_invalidates_the_old_one(db):
    invitation_id, old = make_invitation(db)
    new = _new_raw(db)
    assert new != old
    with pytest.raises(HTTPException):
        invitations.resolve_public(db, old)
    assert invitations.resolve_public(db, new)


def test_invitation_requires_confirmations(db):
    with pytest.raises(HTTPException):
        invitations.create_draft(
            db, "mentee-1", InvitationIn(safe_display_name="X", legitimate_reason_confirmed=False)
        )
    draft = invitations.create_draft(
        db, "mentee-1", InvitationIn(safe_display_name="X", legitimate_reason_confirmed=True)
    )
    assert draft["status"] == "draft"
    with pytest.raises(HTTPException):
        invitations.confirm(db, "mentee-1", draft["id"], ConfirmIn(understands_not_a_match=False))


# --- joining matching after claiming ----------------------------------------------------------


def _join_body():
    return participation.JoinIn(
        confirms_wants_to_mentor=True, reviewed_privacy=True,
        consents_to_be_shown=True, joins_matching=True,
    )


def test_joining_requires_every_onboarding_step(db):
    db.tables["mentor_profiles"].append(
        mentor("new-mentor", onboarding_completed_at=None, visible_to_mentees=False,
               matching_opted_in_at=None)
    )
    with pytest.raises(HTTPException) as err:  # no availability yet
        participation.join(db, "new-mentor", _join_body())
    assert "availability" in err.value.detail
    db.tables["availability"] = [{"user_id": "new-mentor", "slots": ["mon-evening"]}]
    with pytest.raises(HTTPException):
        participation.join(
            db, "new-mentor", participation.JoinIn(
                confirms_wants_to_mentor=True, reviewed_privacy=True,
                consents_to_be_shown=False, joins_matching=True,
            )
        )
    assert participation.join(db, "new-mentor", _join_body())["round"] == "current"


def test_claiming_after_preferences_lock_places_mentor_in_the_next_round(db):
    locked = open_round(status="preferences_locked", locked_at=(NOW - timedelta(hours=1)).isoformat())
    db.tables["matching_rounds"] = [locked]
    _, raw = make_invitation(db)
    invitations.claim(db, user("new-mentor", "mentor"), raw)
    db.tables["mentor_profiles"].append(
        mentor("new-mentor", onboarding_completed_at=None, visible_to_mentees=False,
               matching_opted_in_at=None)
    )
    db.tables["availability"] = [{"user_id": "new-mentor", "slots": ["mon-evening"]}]

    assert participation.join(db, "new-mentor", _join_body())["round"] == "next"
    profile = next(p for p in db.tables["mentor_profiles"] if p["user_id"] == "new-mentor")
    assert not is_mentor_eligible(profile, locked)  # not added to the locked round
    next_round = {"id": "round-2", "status": "preferences_open", "locked_at": None}
    assert is_mentor_eligible(profile, next_round)


def test_leaving_removes_mentor_from_suggestions(db):
    participation.leave(db, "mentor-ok")
    assert matching.suggested_mentors(user_id="mentee-1")["mentors"] == []


# --- rate limits ------------------------------------------------------------------------------


def test_public_invitation_endpoints_are_rate_limited(monkeypatch):
    monkeypatch.setattr(rate_limit, "_ip_calls", rate_limit.defaultdict(list))
    for _ in range(3):
        rate_limit.check_ip_rate_limit("invitation-open", "1.2.3.4", 3, 3600)
    with pytest.raises(HTTPException) as err:
        rate_limit.check_ip_rate_limit("invitation-open", "1.2.3.4", 3, 3600)
    assert err.value.status_code == 429


def test_signed_in_invitation_endpoints_are_rate_limited(monkeypatch):
    monkeypatch.setattr(rate_limit, "_calls", rate_limit.defaultdict(list))
    monkeypatch.setattr(rate_limit, "get_user_id", lambda _auth: "mentee-1")
    create = rate_limit.rate_limit("invitation-create", max_calls=2, window_seconds=3600)
    create("Bearer x")
    create("Bearer x")
    with pytest.raises(HTTPException) as err:
        create("Bearer x")
    assert err.value.status_code == 429


def test_claim_body_rejects_tiny_tokens():
    with pytest.raises(ValueError):
        ClaimIn(token="short")
