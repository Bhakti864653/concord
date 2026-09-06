from app.gale_shapley import run_gale_shapley


def test_simple_one_to_one_match():
    result = run_gale_shapley(
        mentee_prefs={"m1": ["t1"]},
        mentor_prefs={"t1": ["m1"]},
        mentor_capacity={"t1": 1},
    )
    assert result == {"m1": "t1"}


def test_unmatched_when_not_mutually_acceptable():
    # m1 wants t1, but t1 never ranked m1 back
    result = run_gale_shapley(
        mentee_prefs={"m1": ["t1"]},
        mentor_prefs={"t1": []},
        mentor_capacity={"t1": 1},
    )
    assert result == {}


def test_mentee_falls_through_to_second_choice():
    # Both mentees want t1 first, but t1 only has room for m2.
    result = run_gale_shapley(
        mentee_prefs={"m1": ["t1", "t2"], "m2": ["t1"]},
        mentor_prefs={"t1": ["m2", "m1"], "t2": ["m1"]},
        mentor_capacity={"t1": 1, "t2": 1},
    )
    assert result == {"m1": "t2", "m2": "t1"}


def test_mentor_capacity_above_one_holds_multiple():
    result = run_gale_shapley(
        mentee_prefs={"m1": ["t1"], "m2": ["t1"], "m3": ["t1"]},
        mentor_prefs={"t1": ["m1", "m2", "m3"]},
        mentor_capacity={"t1": 2},
    )
    assert result == {"m1": "t1", "m2": "t1"}
    assert "m3" not in result


def test_better_proposal_bumps_worst_held_mentee():
    # t1 (capacity 1) initially holds m2 (its 2nd choice), then m1 (its 1st
    # choice, but a slower proposer) comes along and should bump m2 out.
    result = run_gale_shapley(
        mentee_prefs={"m1": ["t1"], "m2": ["t1"]},
        mentor_prefs={"t1": ["m1", "m2"]},
        mentor_capacity={"t1": 1},
    )
    assert result == {"m1": "t1"}
    assert "m2" not in result


def test_mentee_with_no_preferences_stays_unmatched():
    result = run_gale_shapley(
        mentee_prefs={"m1": []},
        mentor_prefs={"t1": ["m1"]},
        mentor_capacity={"t1": 1},
    )
    assert result == {}


def test_result_is_stable_no_blocking_pair():
    # m1 and m2 want opposite mentors as their top choice, so both get their
    # top choice with no contention - the simplest possible stability check.
    mentee_prefs = {
        "m1": ["t1", "t2"],
        "m2": ["t2", "t1"],
    }
    mentor_prefs = {
        "t1": ["m2", "m1"],
        "t2": ["m1", "m2"],
    }
    result = run_gale_shapley(
        mentee_prefs, mentor_prefs, {"t1": 1, "t2": 1}
    )
    assert result == {"m1": "t1", "m2": "t2"}
