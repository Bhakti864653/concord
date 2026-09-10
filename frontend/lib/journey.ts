export type JourneyStepStatus = "done" | "current" | "locked";

export type JourneyStep = {
  key: string;
  label: string;
  detail: string;
  status: JourneyStepStatus;
  href: string | null;
  milestone?: boolean;
};

/**
 * The dashboard's main view: five stops every user passes through, in order.
 * A step earlier than "matched" only unlocks once the one before it is done;
 * "matched" itself unlocks once preferences are locked, but its own
 * completion is out of the user's hands (it waits on an admin-triggered
 * matching run) - that's the one step whose "current" state means "waiting,"
 * not "your turn."
 */
export function buildJourney(input: {
  ownProfileSummary: string;
  preferencesLocked: boolean;
  matched: boolean;
  matchId: string | null;
  counterpartSummary: string | null;
  hasMessage: boolean;
  hasOverlap: boolean;
}): JourneyStep[] {
  const {
    ownProfileSummary,
    preferencesLocked,
    matched,
    matchId,
    counterpartSummary,
    hasMessage,
    hasOverlap,
  } = input;

  const matchHref = matched && matchId ? `/match/${matchId}` : null;
  const chatHref = matched && matchId ? `/match/${matchId}/chat` : null;
  // Availability now lives as a section on the "Our Plan" page (the
  // /journey route), not its own tab - point here instead of the old
  // standalone /availability route (which now just redirects here anyway).
  const availabilityHref = matched && matchId ? `/match/${matchId}/journey` : null;

  return [
    {
      key: "profile",
      label: "Profile created",
      detail: ownProfileSummary,
      // The dashboard itself already redirects to /onboarding when no
      // profile exists, so by the time this renders, this step is always done.
      status: "done",
      href: null,
    },
    {
      key: "preferences",
      label: "Preferences ranked",
      detail: preferencesLocked
        ? "Locked in and ready for matching"
        : "Rank who you'd most want to work with",
      status: preferencesLocked ? "done" : "current",
      href: "/preferences",
    },
    {
      key: "matched",
      label: "Matched!",
      detail: matched
        ? (counterpartSummary ?? "You've been paired")
        : "Waiting for the next matching run",
      status: matched ? "done" : preferencesLocked ? "current" : "locked",
      href: matchHref,
      milestone: true,
    },
    {
      key: "message",
      label: "First message sent",
      detail: hasMessage ? "You're chatting" : "Say hello to get started",
      status: hasMessage ? "done" : matched ? "current" : "locked",
      href: chatHref,
    },
    {
      key: "schedule",
      label: "Session scheduled",
      detail: hasOverlap ? "You've found a time in common" : "Mark your availability to find a time",
      status: hasOverlap ? "done" : hasMessage ? "current" : "locked",
      href: availabilityHref,
    },
  ];
}
