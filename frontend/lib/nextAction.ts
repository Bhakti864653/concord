export type NextActionKey = "message" | "availability" | "goal" | "session" | "checkin" | "keepgoing";

export type NextAction = {
  key: NextActionKey;
  href: string;
  label: string;
  description: string;
};

/**
 * The one dominant action surfaced on the match overview and dashboard -
 * same priority order both places so the two screens never disagree about
 * what "next" means for a given pair. Purely a function of state already
 * fetched by each page; no new tables or fields needed.
 */
export function computeNextAction(
  matchId: string,
  state: {
    hasMessage: boolean;
    hasOverlap: boolean;
    hasGoal: boolean;
    hasUpcomingSession: boolean;
    hasPendingCheckin: boolean;
  },
): NextAction {
  if (!state.hasMessage) {
    return {
      key: "message",
      href: `/match/${matchId}/chat`,
      label: "Send your first message",
      description: "Say hello and get the conversation started.",
    };
  }
  if (!state.hasOverlap) {
    return {
      key: "availability",
      href: `/match/${matchId}/journey`,
      label: "Coordinate availability",
      description: "Mark your open times to find a slot that works for both of you.",
    };
  }
  if (!state.hasGoal) {
    return {
      key: "goal",
      href: `/match/${matchId}/journey`,
      label: "Create your first shared goal",
      description: "Give this mentorship a clear focus to work toward.",
    };
  }
  if (state.hasPendingCheckin) {
    return {
      key: "checkin",
      href: `/match/${matchId}/checkin`,
      label: "Complete a check-in",
      description: "Quick reflection on your last session - not visible to your partner.",
    };
  }
  if (!state.hasUpcomingSession) {
    return {
      key: "session",
      href: `/match/${matchId}/journey`,
      label: "Schedule a session",
      description: "You've found a time in common - lock in your next session.",
    };
  }
  return {
    key: "keepgoing",
    href: `/match/${matchId}/chat`,
    label: "Keep the conversation going",
    description: "You're set up and moving - check in with your match.",
  };
}
