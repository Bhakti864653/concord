// A client-side mirror of backend/app/gale_shapley.py's mentee-proposing
// deferred acceptance, extended with a human-readable step log so the
// simulator page can show the algorithm actually running, not just the
// final result. Kept in sync by hand, same as lib/matchReasons.ts mirrors
// matching.py's explain_match().
export type SimResult = {
  matches: Record<string, string>;
  log: string[];
};

export function runGaleShapleySim(
  menteePrefs: Record<string, string[]>,
  mentorPrefs: Record<string, string[]>,
  mentorCapacity: Record<string, number>,
): SimResult {
  const log: string[] = [];

  const mentorRank: Record<string, Record<string, number>> = {};
  for (const [mentorId, ranked] of Object.entries(mentorPrefs)) {
    mentorRank[mentorId] = {};
    ranked.forEach((menteeId, i) => {
      mentorRank[mentorId][menteeId] = i;
    });
  }

  const nextProposalIndex: Record<string, number> = {};
  for (const menteeId of Object.keys(menteePrefs)) nextProposalIndex[menteeId] = 0;
  const mentorHeld: Record<string, string[]> = {};
  for (const mentorId of Object.keys(mentorPrefs)) mentorHeld[mentorId] = [];

  const unmatched = Object.keys(menteePrefs).filter(
    (id) => (menteePrefs[id] ?? []).length > 0,
  );

  let guard = 0;
  while (unmatched.length > 0 && guard < 500) {
    guard += 1;
    const menteeId = unmatched.shift()!;
    const ranked = menteePrefs[menteeId] ?? [];
    const idx = nextProposalIndex[menteeId];
    if (idx >= ranked.length) {
      log.push(`${menteeId} has no one left to propose to - stays unmatched.`);
      continue;
    }
    const mentorId = ranked[idx];
    nextProposalIndex[menteeId] = idx + 1;
    log.push(`${menteeId} proposes to ${mentorId}.`);

    const ranksThisMentee = mentorRank[mentorId] ?? {};
    if (!(menteeId in ranksThisMentee)) {
      log.push(`${mentorId} never ranked ${menteeId} - rejected.`);
      unmatched.push(menteeId);
      continue;
    }

    const held = mentorHeld[mentorId];
    const capacity = mentorCapacity[mentorId] ?? 1;
    if (held.length < capacity) {
      held.push(menteeId);
      log.push(`${mentorId} has room and tentatively holds ${menteeId}.`);
    } else if (held.length > 0) {
      const worst = held.reduce((a, b) => (ranksThisMentee[a] > ranksThisMentee[b] ? a : b));
      if (ranksThisMentee[menteeId] < ranksThisMentee[worst]) {
        log.push(`${mentorId} prefers ${menteeId} over ${worst} - swaps them out.`);
        mentorHeld[mentorId] = held.filter((m) => m !== worst).concat(menteeId);
        unmatched.push(worst);
      } else {
        log.push(`${mentorId} prefers who they're already holding - ${menteeId} rejected.`);
        unmatched.push(menteeId);
      }
    } else {
      log.push(`${mentorId} has no capacity left - rejected.`);
      unmatched.push(menteeId);
    }
  }

  const matches: Record<string, string> = {};
  for (const [mentorId, mentees] of Object.entries(mentorHeld)) {
    for (const menteeId of mentees) matches[menteeId] = mentorId;
  }
  return { matches, log };
}
