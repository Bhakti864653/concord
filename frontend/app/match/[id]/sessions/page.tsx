import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import SessionsList from "./SessionsList";

export default async function SessionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await requireMatch(supabase, id);

  const { data: sessions } = await supabase
    .from("match_sessions")
    .select("id, scheduled_for, created_by, created_at")
    .eq("match_mentee_id", id)
    .order("scheduled_for", { ascending: false });

  // RLS already restricts this to the caller's own rows, but filtering
  // explicitly keeps the intent readable here too.
  const { data: checkins } = await supabase
    .from("session_checkins")
    .select("id, session_id, did_happen, helpfulness, continue_wanted, focus_next")
    .eq("user_id", user.id);

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
      <MatchTabs id={id} active="sessions" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Sessions
        </h1>
        <p className="text-sm text-muted">
          Log when you meet. Once a session&apos;s time has passed, you&apos;ll each get a short
          private check-in - your partner never sees your answers.
        </p>
      </div>
      <SessionsList
        matchId={id}
        currentUserId={user.id}
        initialSessions={sessions ?? []}
        initialCheckins={checkins ?? []}
      />
    </main>
  );
}
