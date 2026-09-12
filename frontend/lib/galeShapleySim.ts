// A client-side mirror of backend/app/gale_shapley.py's mentee-proposing
// deferred acceptance, extended with a round-by-round trace so the
// simulator page can show the algorithm actually running, not just the
// final result. Kept in sync by hand, same as lib/matchReasons.ts mirrors
// matching.py's explain_match().
//
// Processes proposals in rounds (every currently-unmatched mentee with
// someone left to propose to proposes simultaneously, each mentor then
// resolves all its new offers against what it's already holding) rather
// than one proposal at a time - a well-known property of deferred
// acceptance is that the resulting stable matching doesn't depend on
// proposal order, so this produces the identical outcome as a strict
// one-at-a-time trace while giving the visualizer real "rounds" to step
// through, as the transparency page asks for.
export type SimResult = {
  matches: Record<string, string>;
  log: string[];
};

export type Proposal = {
  mentee: string;
  mentor: string;
  outcome: "held" | "rejected";
  reason?: "not-ranked" | "outranked";
};

/** A mentee who was held going into this round but got bumped out of it. */
export type Release = {
  mentee: string;
  mentor: string;
};

export type Round = {
  index: number; // 1-based
  proposals: Proposal[];
  releases: Release[];
  /** Every mentor's held mentees, as of the end of this round. */
  mentorHeld: Record<string, string[]>;
  logLines: string[];
};

export function runGaleShapleySimRounds(
  menteePrefs: Record<string, string[]>,
  mentorPrefs: Record<string, string[]>,
  mentorCapacity: Record<string, number>,
): Round[] {
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
  const currentlyHeld = new Set<string>();

  const rounds: Round[] = [];
  let guard = 0;

  while (guard < 200) {
    guard += 1;
    const proposers = Object.keys(menteePrefs).filter(
      (id) => !currentlyHeld.has(id) && nextProposalIndex[id] < (menteePrefs[id]?.length ?? 0),
    );
    if (proposers.length === 0) break;

    const proposals: Proposal[] = [];
    const releases: Release[] = [];
    const logLines: string[] = [];
    const incomingByMentor: Record<string, string[]> = {};

    for (const menteeId of proposers) {
      const ranked = menteePrefs[menteeId] ?? [];
      const idx = nextProposalIndex[menteeId];
      const mentorId = ranked[idx];
      nextProposalIndex[menteeId] = idx + 1;

      const ranksThisMentor = mentorRank[mentorId] ?? {};
      if (!(menteeId in ranksThisMentor)) {
        proposals.push({ mentee: menteeId, mentor: mentorId, outcome: "rejected", reason: "not-ranked" });
        logLines.push(`${menteeId} proposes to ${mentorId} - never ranked, rejected.`);
        continue;
      }

      logLines.push(`${menteeId} proposes to ${mentorId}.`);
      proposals.push({ mentee: menteeId, mentor: mentorId, outcome: "held" });
      (incomingByMentor[mentorId] ??= []).push(menteeId);
    }

    for (const [mentorId, newMentees] of Object.entries(incomingByMentor)) {
      const capacity = mentorCapacity[mentorId] ?? 0;
      const ranksThisMentor = mentorRank[mentorId] ?? {};
      const pool = [...mentorHeld[mentorId], ...newMentees];
      pool.sort((a, b) => (ranksThisMentor[a] ?? Infinity) - (ranksThisMentor[b] ?? Infinity));
      const kept = pool.slice(0, capacity);
      const released = pool.slice(capacity);

      mentorHeld[mentorId] = kept;
      for (const menteeId of kept) currentlyHeld.add(menteeId);

      for (const menteeId of released) {
        currentlyHeld.delete(menteeId);
        const wasNewThisRound = newMentees.includes(menteeId);
        if (wasNewThisRound) {
          const proposal = proposals.find((p) => p.mentee === menteeId && p.mentor === mentorId);
          if (proposal) {
            proposal.outcome = "rejected";
            proposal.reason = "outranked";
          }
          logLines.push(`${mentorId} prefers who they're already holding - ${menteeId} rejected.`);
        } else {
          releases.push({ mentee: menteeId, mentor: mentorId });
          logLines.push(`${mentorId} prefers a new proposer over ${menteeId} - releases them.`);
        }
      }
    }

    rounds.push({
      index: rounds.length + 1,
      proposals,
      releases,
      mentorHeld: Object.fromEntries(Object.entries(mentorHeld).map(([k, v]) => [k, [...v]])),
      logLines,
    });
  }

  return rounds;
}

export function runGaleShapleySim(
  menteePrefs: Record<string, string[]>,
  mentorPrefs: Record<string, string[]>,
  mentorCapacity: Record<string, number>,
): SimResult {
  const rounds = runGaleShapleySimRounds(menteePrefs, mentorPrefs, mentorCapacity);
  const log = rounds.flatMap((r) => r.logLines);
  const lastHeld = rounds[rounds.length - 1]?.mentorHeld ?? {};

  const matches: Record<string, string> = {};
  for (const [mentorId, mentees] of Object.entries(lastHeld)) {
    for (const menteeId of mentees) matches[menteeId] = mentorId;
  }

  for (const menteeId of Object.keys(menteePrefs)) {
    if (!(menteeId in matches)) {
      log.push(`${menteeId} has no one left to propose to - stays unmatched.`);
    }
  }

  return { matches, log };
}
