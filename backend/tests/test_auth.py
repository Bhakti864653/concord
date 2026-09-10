import pytest
from fastapi import HTTPException
from supabase_auth.errors import AuthApiError

from app import auth


class FakeUser:
    def __init__(self, id: str, email: str | None):
        self.id = id
        self.email = email


class FakeAuthResult:
    def __init__(self, user):
        self.user = user


class FakeSupabaseAuth:
    def __init__(self, user):
        self._user = user

    def get_user(self, token):
        return FakeAuthResult(self._user)


class RaisingSupabaseAuth:
    """The real gotrue/supabase-py client raises AuthApiError for an
    invalid/expired/malformed token rather than returning a falsy result -
    this simulates that so a regression here (an uncaught 502 instead of a
    clean 401) gets caught by the suite."""

    def get_user(self, token):
        raise AuthApiError("invalid JWT: token is malformed", status=401, code="bad_jwt")


class FakeAdminClient:
    def __init__(self, user):
        self.auth = FakeSupabaseAuth(user)


def _patch_admin_client(monkeypatch, user):
    monkeypatch.setattr(auth, "get_admin_client", lambda: FakeAdminClient(user))


def test_get_user_id_requires_bearer_prefix():
    with pytest.raises(HTTPException) as exc_info:
        auth.get_user_id("some-raw-token")
    assert exc_info.value.status_code == 401


def test_get_user_id_requires_authorization_header():
    with pytest.raises(HTTPException) as exc_info:
        auth.get_user_id(None)
    assert exc_info.value.status_code == 401


def test_get_user_id_rejects_a_token_supabase_does_not_recognize(monkeypatch):
    _patch_admin_client(monkeypatch, user=None)
    with pytest.raises(HTTPException) as exc_info:
        auth.get_user_id("Bearer bad-token")
    assert exc_info.value.status_code == 401


def test_get_user_id_rejects_a_token_supabase_raises_on(monkeypatch):
    class FakeAdminClient:
        auth = RaisingSupabaseAuth()

    monkeypatch.setattr(auth, "get_admin_client", lambda: FakeAdminClient())
    with pytest.raises(HTTPException) as exc_info:
        auth.get_user_id("Bearer stale-or-malformed-token")
    assert exc_info.value.status_code == 401


def test_get_user_id_returns_the_authenticated_users_id(monkeypatch):
    _patch_admin_client(monkeypatch, user=FakeUser(id="u1", email="mentee@example.com"))
    assert auth.get_user_id("Bearer good-token") == "u1"


def test_require_admin_rejects_a_non_admin_user(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "admin@example.com")
    _patch_admin_client(monkeypatch, user=FakeUser(id="u1", email="mentee@example.com"))
    with pytest.raises(HTTPException) as exc_info:
        auth.require_admin("Bearer good-token")
    assert exc_info.value.status_code == 403


def test_require_admin_allows_the_admin_email_case_insensitively(monkeypatch):
    monkeypatch.setenv("ADMIN_EMAIL", "Admin@Example.com")
    _patch_admin_client(monkeypatch, user=FakeUser(id="admin-id", email="admin@example.com"))
    assert auth.require_admin("Bearer good-token") == "admin-id"
