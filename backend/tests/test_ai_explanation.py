import logging
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import anthropic
import pytest
from fastapi import HTTPException

from app import ai_explanation
from app.ai_explanation import (
    SYSTEM_PROMPT,
    _build_user_message,
    _build_whitelisted_payload,
    build_deterministic_fallback,
    generate_ai_explanation,
    get_ai_explanation,
)


class FakeBackgroundTasks:
    def __init__(self):
        self.tasks: list[tuple] = []

    def add_task(self, func, *args, **kwargs):
        self.tasks.append((func, args, kwargs))


class FakeQuery:
    def __init__(self, table_store, name):
        self._store = table_store
        self._name = name
        self._filters: dict = {}
        self._single = False
        self._pending_write = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self._filters[column] = value
        return self

    def maybe_single(self):
        self._single = True
        return self

    def insert(self, row):
        self._pending_write = ("insert", dict(row))
        return self

    def update(self, row):
        self._pending_write = ("update", dict(row))
        return self

    def execute(self):
        rows = self._store.setdefault(self._name, [])
        if self._pending_write:
            kind, payload = self._pending_write
            if kind == "insert":
                # Mirrors match_ai_explanations.match_id being a real
                # primary key in Postgres: a second insert for a match_id
                # that already has a row raises, exactly like a real
                # unique-violation would surface through postgrest.
                if self._name == "match_ai_explanations" and any(
                    r.get("match_id") == payload.get("match_id") for r in rows
                ):
                    raise RuntimeError("duplicate key value violates unique constraint")
                rows.append(payload)
                self._result = [payload]
            else:
                # Mirrors return=representation: .data comes back as
                # whichever rows the filters actually matched (and were
                # just updated) - empty if the conditional UPDATE's WHERE
                # clause (e.g. a stale attempt_count) matched nothing, the
                # same signal a real CAS-style update gives.
                matched = [
                    r for r in rows if all(r.get(k) == v for k, v in self._filters.items())
                ]
                for r in matched:
                    r.update(payload)
                self._result = matched
            return self

        matches = [r for r in rows if all(r.get(k) == v for k, v in self._filters.items())]
        self._result = (matches[0] if matches else None) if self._single else matches
        return self

    @property
    def data(self):
        return getattr(self, "_result", None)


class FakeAdminClient:
    def __init__(self, tables: dict[str, list[dict]], raise_for_table: str | None = None):
        self._tables = tables
        self._raise_for_table = raise_for_table

    def table(self, name):
        if name == self._raise_for_table:
            return _RaisingQuery()
        return FakeQuery(self._tables, name)


class _RaisingQuery:
    """Simulates a table that isn't reachable yet - e.g. the
    match_ai_explanations migration hasn't been run - every builder method
    just returns self, and execute() is what actually raises, matching
    where a real postgrest error would surface."""

    def select(self, *_a, **_k):
        return self

    def insert(self, *_a, **_k):
        return self

    def update(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def maybe_single(self):
        return self

    def execute(self):
        raise RuntimeError("relation \"match_ai_explanations\" does not exist")


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
        "match_ai_explanations": [],
    }


class FakeTextBlock:
    def __init__(self, text):
        self.type = "text"
        self.text = text


class FakeMessages:
    def __init__(self, response=None, error=None):
        self._response = response
        self._error = error
        self.calls: list[dict] = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        if self._error:
            raise self._error
        return SimpleNamespace(content=[FakeTextBlock(self._response)])


class FakeAnthropicClient:
    def __init__(self, response=None, error=None, **_kwargs):
        self.messages = FakeMessages(response=response, error=error)


# --- authorization / cross-user access ---------------------------------


def test_get_ai_explanation_rejects_a_non_participant(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        get_ai_explanation("match-1", background_tasks=FakeBackgroundTasks(), user_id="some-stranger")
    assert exc_info.value.status_code == 403


def test_get_ai_explanation_404s_for_unknown_match(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    with pytest.raises(HTTPException) as exc_info:
        get_ai_explanation(
            "no-such-match", background_tasks=FakeBackgroundTasks(), user_id="mentee-1"
        )
    assert exc_info.value.status_code == 404


# --- prompt input filtering ----------------------------------------------


def test_whitelisted_payload_excludes_everything_not_explicitly_allowed():
    payload = _build_whitelisted_payload(
        mentee_goal="breaking into product management",
        mentor_experience="product management coaching",
        shared_words=["product", "management"],
    )
    assert set(payload.keys()) == {"mentee_goal", "mentor_experience", "shared_topics"}


def test_user_message_never_contains_tags_or_other_fields():
    payload = _build_whitelisted_payload(
        "breaking into product management", "product management coaching", ["product"]
    )
    message = _build_user_message(payload)
    for forbidden in ["first-gen", "mentee-1", "mentor-1", "my very private secret", "@"]:
        assert forbidden not in message


# --- hallucination-prevention instructions --------------------------------


@pytest.mark.parametrize(
    "required_phrase",
    [
        "Use only the facts provided",
        "Never infer or speculate about sensitive or protected characteristics",
        "Gale-Shapley",
        "Do not promise or imply that the mentorship will succeed",
        "3 to 5 concise sentences",
        "plain text only",
    ],
)
def test_system_prompt_contains_required_guardrail(required_phrase):
    assert required_phrase in SYSTEM_PROMPT


# --- idempotency -----------------------------------------------------------


def test_generate_is_idempotent_when_row_already_exists(monkeypatch):
    tables = _base_tables()
    tables["match_ai_explanations"].append({"match_id": "match-1", "status": "ready"})
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    fake_client = FakeAnthropicClient(response="should never be called")
    monkeypatch.setattr(
        ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client
    )

    generate_ai_explanation("match-1")

    assert fake_client.messages.calls == []


# --- successful generation --------------------------------------------------


def test_generate_success_writes_ready_row(monkeypatch):
    tables = _base_tables()
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-secret")

    fake_client = FakeAnthropicClient(response="A warm, three sentence introduction.")
    monkeypatch.setattr(
        ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client
    )

    generate_ai_explanation("match-1")

    row = tables["match_ai_explanations"][0]
    assert row["status"] == "ready"
    assert row["explanation"] == "A warm, three sentence introduction."
    assert row["model"] == ai_explanation.MODEL
    assert row["prompt_version"] == ai_explanation.PROMPT_VERSION
    assert len(fake_client.messages.calls) == 1


# --- timeout / API failure --------------------------------------------------


def test_generate_timeout_marks_row_failed_without_raising(monkeypatch):
    tables = _base_tables()
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-secret")

    timeout_error = anthropic.APITimeoutError(request=SimpleNamespace())
    fake_client = FakeAnthropicClient(error=timeout_error)
    monkeypatch.setattr(
        ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client
    )

    generate_ai_explanation("match-1")  # must not raise

    row = tables["match_ai_explanations"][0]
    assert row["status"] == "failed"
    assert row["error_code"] == "timeout"


def test_generate_generic_provider_error_marks_row_failed(monkeypatch):
    tables = _base_tables()
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-secret")

    fake_client = FakeAnthropicClient(error=RuntimeError("connection reset"))
    monkeypatch.setattr(
        ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client
    )

    generate_ai_explanation("match-1")

    row = tables["match_ai_explanations"][0]
    assert row["status"] == "failed"
    assert row["error_code"] == "provider_error"


# --- deterministic fallback --------------------------------------------------


def test_deterministic_fallback_mentions_a_shared_topic():
    text = build_deterministic_fallback(
        "breaking into product management",
        "product management coaching",
        shared_words=["product", "management"],
        shared_tags=["first-gen"],
    )
    assert "product" in text
    assert 3 <= text.count(".") <= 4


def test_get_ai_explanation_returns_fallback_when_pending(monkeypatch):
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    result = get_ai_explanation("match-1", background_tasks=FakeBackgroundTasks(), user_id="mentee-1")

    assert result["status"] == "pending"
    assert result["is_fallback"] is True
    assert "product" in result["explanation"]


def test_get_ai_explanation_returns_ai_text_when_ready(monkeypatch):
    tables = _base_tables()
    tables["match_ai_explanations"].append(
        {"match_id": "match-1", "status": "ready", "explanation": "The real AI narrative."}
    )
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    result = get_ai_explanation("match-1", background_tasks=FakeBackgroundTasks(), user_id="mentor-1")

    assert result == {
        "status": "ready",
        "explanation": "The real AI narrative.",
        "is_fallback": False,
    }


# --- lazy generation for existing/demo matches ------------------------------


def test_lazy_get_schedules_generation_when_no_row_exists(monkeypatch):
    """Existing matches (created before this feature) and demo matches
    (demo.py never inserts a match_ai_explanations row either) look
    identical here: no row yet. The GET must still respond immediately
    with the fallback and schedule generation in the background rather
    than making the page wait on Anthropic."""
    fake = FakeAdminClient(_base_tables())
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    bg = FakeBackgroundTasks()

    result = get_ai_explanation("match-1", background_tasks=bg, user_id="mentee-1")

    assert result["status"] == "pending"
    assert result["is_fallback"] is True
    assert len(bg.tasks) == 1
    func, args, _kwargs = bg.tasks[0]
    assert func is generate_ai_explanation
    assert args == ("match-1",)


def test_lazy_generation_completes_when_the_scheduled_task_runs(monkeypatch):
    tables = _base_tables()
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-secret")
    fake_client = FakeAnthropicClient(response="Warm intro text.")
    monkeypatch.setattr(ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client)
    bg = FakeBackgroundTasks()

    get_ai_explanation("match-1", background_tasks=bg, user_id="mentee-1")
    func, args, kwargs = bg.tasks[0]
    func(*args, **kwargs)  # simulate FastAPI running the scheduled task

    row = tables["match_ai_explanations"][0]
    assert row["status"] == "ready"
    assert row["explanation"] == "Warm intro text."
    assert len(fake_client.messages.calls) == 1


def test_ready_row_never_schedules_a_background_task(monkeypatch):
    tables = _base_tables()
    tables["match_ai_explanations"].append(
        {"match_id": "match-1", "status": "ready", "explanation": "Already generated."}
    )
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    bg = FakeBackgroundTasks()

    get_ai_explanation("match-1", background_tasks=bg, user_id="mentee-1")

    assert bg.tasks == []


# --- stale-pending recovery --------------------------------------------------


def test_stale_pending_row_is_retried(monkeypatch):
    tables = _base_tables()
    stale_timestamp = (datetime.now(timezone.utc) - timedelta(seconds=999)).isoformat()
    tables["match_ai_explanations"].append(
        {
            "match_id": "match-1",
            "status": "pending",
            "attempt_count": 1,
            "last_attempt_at": stale_timestamp,
        }
    )
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-secret")
    fake_client = FakeAnthropicClient(response="Recovered narrative.")
    monkeypatch.setattr(ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client)

    generate_ai_explanation("match-1")  # e.g. a server restart orphaned attempt 1

    row = tables["match_ai_explanations"][0]
    assert row["status"] == "ready"
    assert row["attempt_count"] == 2
    assert len(fake_client.messages.calls) == 1


def test_fresh_pending_row_is_not_retried(monkeypatch):
    """A genuinely in-flight attempt (started moments ago) must not be
    reclaimed by a second, near-simultaneous caller - this is the
    duplicate-charge protection for concurrent lazy-GET triggers."""
    tables = _base_tables()
    tables["match_ai_explanations"].append(
        {
            "match_id": "match-1",
            "status": "pending",
            "attempt_count": 1,
            "last_attempt_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    fake_client = FakeAnthropicClient(response="should never be called")
    monkeypatch.setattr(ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client)

    generate_ai_explanation("match-1")

    assert fake_client.messages.calls == []


# --- bounded retries ---------------------------------------------------------


def test_retryable_failure_stops_after_max_attempts(monkeypatch):
    tables = _base_tables()
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-secret")
    fake_client = FakeAnthropicClient(error=RuntimeError("connection reset"))
    monkeypatch.setattr(ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client)

    for _ in range(5):
        generate_ai_explanation("match-1")
        # Fast-forward past the backoff window instead of sleeping in the
        # test - each call otherwise correctly waits for next_retry_at.
        tables["match_ai_explanations"][0]["next_retry_at"] = None

    row = tables["match_ai_explanations"][0]
    assert row["attempt_count"] == ai_explanation.MAX_ATTEMPTS == 3
    assert row["status"] == "failed"
    assert row["error_code"] == "provider_error"
    assert len(fake_client.messages.calls) == 3


def test_permanent_failure_is_never_retried(monkeypatch):
    tables = _base_tables()
    tables["mentee_profiles"] = []  # match context can never be loaded
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test-secret")
    fake_client = FakeAnthropicClient(response="should never be called")
    monkeypatch.setattr(ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client)

    generate_ai_explanation("match-1")
    row = tables["match_ai_explanations"][0]
    assert row["status"] == "failed"
    assert row["error_code"] == "match_context_missing"
    assert row["next_retry_at"] is None

    generate_ai_explanation("match-1")  # a later lazy trigger must not retry this

    row = tables["match_ai_explanations"][0]
    assert row["attempt_count"] == 1
    assert fake_client.messages.calls == []


# --- secret protection --------------------------------------------------


def test_generate_never_raises_when_table_is_unreachable(monkeypatch):
    fake = FakeAdminClient(_base_tables(), raise_for_table="match_ai_explanations")
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    generate_ai_explanation("match-1")  # must not raise


def test_get_ai_explanation_falls_back_when_table_is_unreachable(monkeypatch):
    fake = FakeAdminClient(_base_tables(), raise_for_table="match_ai_explanations")
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)

    result = get_ai_explanation(
        "match-1", background_tasks=FakeBackgroundTasks(), user_id="mentee-1"
    )

    assert result["status"] == "pending"
    assert result["is_fallback"] is True
    assert "product" in result["explanation"]


def test_api_key_never_appears_in_response_row_or_logs(monkeypatch, caplog):
    tables = _base_tables()
    fake = FakeAdminClient(tables)
    monkeypatch.setattr(ai_explanation, "get_admin_client", lambda: fake)
    secret = "sk-ant-super-secret-value"
    monkeypatch.setenv("ANTHROPIC_API_KEY", secret)

    # The exception itself carries the fake key, exactly like a provider
    # error/traceback might - this is what `logger.exception` (now removed
    # from this module) would have happily logged in full.
    fake_client = FakeAnthropicClient(error=RuntimeError(f"upstream said: {secret}"))
    monkeypatch.setattr(
        ai_explanation.anthropic, "Anthropic", lambda **_kwargs: fake_client
    )

    with caplog.at_level(logging.WARNING, logger="concord"):
        generate_ai_explanation("match-1")
        result = get_ai_explanation(
            "match-1", background_tasks=FakeBackgroundTasks(), user_id="mentee-1"
        )

    assert secret not in str(result)
    assert secret not in str(tables["match_ai_explanations"])
    assert secret not in caplog.text
    # A safe event happened and was still logged - just without the secret.
    assert "ai_explanation_generation_failed" in caplog.text
