import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import GoalsList from "./GoalsList";

export default async function GoalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await requireMatch(supabase, id);

  const { data: goals } = await supabase
    .from("match_goals")
    .select("id, title, deadline, notes, created_by, created_at")
    .eq("match_mentee_id", id)
    .order("created_at", { ascending: true });

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
    <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-4 overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none absolute -right-1/3 -top-1/4 -z-10 h-[70%] w-[70%] opacity-40"
      />
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <MatchTabs id={id} active="goals" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Shared goals
        </h1>
        <p className="text-sm text-muted">
          Up to 3 goals you&apos;re both working toward, each with its own milestones.
        </p>
      </div>
      <GoalsList
        matchId={id}
        currentUserId={user.id}
        initialGoals={goals ?? []}
        initialMilestones={milestones ?? []}
      />
    </main>
  );
}
