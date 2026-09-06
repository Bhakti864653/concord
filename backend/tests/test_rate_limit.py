from collections import defaultdict

from app.rate_limit import _check_and_record


def fresh_bucket():
    return defaultdict(list)


def test_allows_calls_under_the_limit():
    bucket = fresh_bucket()
    for i in range(3):
        assert _check_and_record(bucket, ("profile-mentee", "u1"), 3, 60, now=float(i))


def test_blocks_the_call_that_exceeds_the_limit():
    bucket = fresh_bucket()
    for i in range(3):
        _check_and_record(bucket, ("profile-mentee", "u1"), 3, 60, now=float(i))
    assert _check_and_record(bucket, ("profile-mentee", "u1"), 3, 60, now=3.0) is False


def test_old_calls_outside_the_window_are_forgotten():
    bucket = fresh_bucket()
    for i in range(3):
        _check_and_record(bucket, ("profile-mentee", "u1"), 3, 60, now=float(i))
    # All 3 prior calls are now more than 60s in the past.
    assert _check_and_record(bucket, ("profile-mentee", "u1"), 3, 60, now=1000.0) is True


def test_different_users_have_independent_budgets():
    bucket = fresh_bucket()
    for i in range(3):
        _check_and_record(bucket, ("profile-mentee", "u1"), 3, 60, now=float(i))
    assert _check_and_record(bucket, ("profile-mentee", "u2"), 3, 60, now=3.0) is True


def test_different_endpoint_names_have_independent_budgets():
    bucket = fresh_bucket()
    for i in range(3):
        _check_and_record(bucket, ("profile-mentee", "u1"), 3, 60, now=float(i))
    assert _check_and_record(bucket, ("suggested-mentors", "u1"), 3, 60, now=3.0) is True
