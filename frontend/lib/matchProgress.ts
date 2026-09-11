import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type MatchProgress = {
  hasMessage: boolean;
  hasOverlap: boolean;
  goalsTotal: number;
  milestonesTotal: number;
  milestonesDone: number;
  hasUpcomingSession: boolean;
  nextSession: { id: string; scheduled_for: string } | null;
  hasPendingCheckin: boolean;
};

/**
 * The signals the match overview and dashboard both need to pick a
 * NextActionCard and show goal/session progress - one place so the two
 * screens can't drift into disagreeing about a pair's state. Read-only,
 * against tables/queries that already existed per-page before this pass.
 */
export async function loadMatchProgress(
  supabase: SupabaseServerClient,
  matchId: string,
  userId: string,
  counterpartId: string,
): Promise<MatchProgress> {
  const [
    { data: messageRows },
    { data: ownAvailability },
    { data: partnerAvailability },
    { data: goals },
    { data: sessions },
  ] = await Promise.all([
    supabase.from("messages").select("id").eq("match_id", matchId).limit(1),
    supabase.from("availability").select("slots").eq("user_id", userId).maybeSingle(),
    supabase.from("availability").select("slots").eq("user_id", counterpartId).maybeSingle(),
    supabase.from("match_goals").select("id").eq("match_id", matchId),
    supabase.from("match_sessions").select("id, scheduled_for").eq("match_id", matchId),
  ]);

  const ownSlots = new Set(ownAvailability?.slots ?? []);
  const hasOverlap = (partnerAvailability?.slots ?? []).some((slot: string) => ownSlots.has(slot));

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: milestones } =
    goalIds.length > 0
      ? await supabase.from("match_milestones").select("id, done").in("goal_id", goalIds)
      : { data: [] };

  const now = Date.now();
  const upcoming = (sessions ?? [])
    .filter((s) => new Date(s.scheduled_for).getTime() >= now)
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
  const pastSessionIds = (sessions ?? [])
    .filter((s) => new Date(s.scheduled_for).getTime() < now)
    .map((s) => s.id);

  let hasPendingCheckin = false;
  if (pastSessionIds.length > 0) {
    const { data: checkins } = await supabase
      .from("session_checkins")
      .select("session_id")
      .eq("user_id", userId)
      .in("session_id", pastSessionIds);
    const checkedInIds = new Set((checkins ?? []).map((c) => c.session_id));
    hasPendingCheckin = pastSessionIds.some((sid) => !checkedInIds.has(sid));
  }

  return {
    hasMessage: (messageRows ?? []).length > 0,
    hasOverlap,
    goalsTotal: goalIds.length,
    milestonesTotal: (milestones ?? []).length,
    milestonesDone: (milestones ?? []).filter((m) => m.done).length,
    hasUpcomingSession: upcoming.length > 0,
    nextSession: upcoming[0] ?? null,
    hasPendingCheckin,
  };
}
