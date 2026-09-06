def run_gale_shapley(
    mentee_prefs: dict[str, list[str]],
    mentor_prefs: dict[str, list[str]],
    mentor_capacity: dict[str, int],
) -> dict[str, str]:
    """Mentee-proposing deferred acceptance, generalized to mentor capacity > 1
    (the "hospital/residents" variant of Gale-Shapley). A mentor/mentee pair
    missing from either side's ranked list is treated as mutually
    unacceptable - standard Gale-Shapley semantics, not an error.

    Returns {mentee_id: mentor_id} for every mentee who ended up matched.
    Unmatched mentees (exhausted their list, or no mutual acceptability with
    anyone) are simply absent from the result.
    """
    mentor_rank = {
        mentor_id: {mentee_id: i for i, mentee_id in enumerate(ranked)}
        for mentor_id, ranked in mentor_prefs.items()
    }

    next_proposal_index = {mentee_id: 0 for mentee_id in mentee_prefs}
    mentor_held: dict[str, list[str]] = {mentor_id: [] for mentor_id in mentor_prefs}
    unmatched = [
        mentee_id for mentee_id, ranked in mentee_prefs.items() if ranked
    ]

    while unmatched:
        mentee_id = unmatched.pop(0)
        ranked = mentee_prefs[mentee_id]
        idx = next_proposal_index[mentee_id]
        if idx >= len(ranked):
            continue  # exhausted their list - stays unmatched
        mentor_id = ranked[idx]
        next_proposal_index[mentee_id] = idx + 1

        ranks_this_mentee = mentor_rank.get(mentor_id, {})
        if mentee_id not in ranks_this_mentee:
            unmatched.append(mentee_id)  # not mutually acceptable, try next
            continue

        held = mentor_held[mentor_id]
        capacity = mentor_capacity.get(mentor_id, 1)
        if len(held) < capacity:
            held.append(mentee_id)
        else:
            worst = max(held, key=lambda m: ranks_this_mentee[m])
            if ranks_this_mentee[mentee_id] < ranks_this_mentee[worst]:
                held.remove(worst)
                held.append(mentee_id)
                unmatched.append(worst)
            else:
                unmatched.append(mentee_id)

    return {
        mentee_id: mentor_id
        for mentor_id, mentees in mentor_held.items()
        for mentee_id in mentees
    }
