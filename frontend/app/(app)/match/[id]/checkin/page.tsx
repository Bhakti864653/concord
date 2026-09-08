import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import CheckinList from "./CheckinList";

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await requireMatch(supabase, id);

  const [{ data: sessions }, { data: checkins }] = await Promise.all([
    supabase
      .from("match_sessions")
      .select("id, scheduled_for")
      .eq("match_mentee_id", id)
      .order("scheduled_for", { ascending: false }),
    supabase
      .from("session_checkins")
      .select("id, session_id")
      .eq("user_id", user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <MatchTabs id={id} active="checkin" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Private check-in
        </h1>
        <p className="text-sm text-muted">
          How did your session feel? Your answers are private and never shown to your match
          partner.
        </p>
      </div>
      <CheckinList
        currentUserId={user.id}
        initialSessions={sessions ?? []}
        initialCheckins={checkins ?? []}
      />
      <p className="text-sm text-muted">
        Looking to end the match or report a concern instead? That&apos;s under{" "}
        <Link href={`/match/${id}/safety`} className="font-medium text-ink underline">
          Trust &amp; safety
        </Link>
        .
      </p>
    </div>
  );
}
