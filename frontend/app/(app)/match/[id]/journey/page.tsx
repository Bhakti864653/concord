import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import GoalsList from "../goals/GoalsList";
import SessionsList from "../sessions/SessionsList";

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await requireMatch(supabase, id);

  const [{ data: goals }, { data: sessions }, { data: checkins }] = await Promise.all([
    supabase
      .from("match_goals")
      .select("id, title, deadline, notes, created_by, created_at")
      .eq("match_mentee_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("match_sessions")
      .select("id, scheduled_for, created_by, created_at")
      .eq("match_mentee_id", id)
      .order("scheduled_for", { ascending: false }),
    supabase
      .from("session_checkins")
      .select("id, session_id, did_happen, helpfulness, continue_wanted, focus_next")
      .eq("user_id", user.id),
  ]);

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: milestones } =
    goalIds.length > 0
      ? await supabase
          .from("match_milestones")
          .select("id, goal_id, title, done, created_at")
          .in("goal_id", goalIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  return (
    <div className="flex flex-col gap-4">
      <MatchTabs id={id} active="journey" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Turn guidance into progress.
        </h1>
        <p className="text-sm text-muted">
          Keep the relationship focused without making mentorship feel like homework.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <p className="text-xs font-bold text-muted">SHARED GOALS</p>
          <GoalsList
            matchId={id}
            currentUserId={user.id}
            initialGoals={goals ?? []}
            initialMilestones={milestones ?? []}
          />
        </section>
        <section className="flex flex-col gap-3">
          <p className="text-xs font-bold text-muted">SESSIONS</p>
          <SessionsList
            matchId={id}
            currentUserId={user.id}
            initialSessions={sessions ?? []}
            initialCheckins={checkins ?? []}
          />
          <Link href={`/match/${id}/checkin`} className="text-sm font-medium text-mentee underline">
            Go to your pending check-ins →
          </Link>
        </section>
      </div>
    </div>
  );
}
