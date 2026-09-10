import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import PageHeader from "@/components/ui/PageHeader";
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
      .eq("match_id", id)
      .order("scheduled_for", { ascending: false }),
    supabase
      .from("session_checkins")
      .select("id, session_id")
      .eq("user_id", user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <MatchTabs id={id} active="checkins" />
      <PageHeader
        title="Private check-in"
        subtitle="How did your session feel? Your answers are private and never shown to your match partner."
      />
      <CheckinList
        currentUserId={user.id}
        initialSessions={sessions ?? []}
        initialCheckins={checkins ?? []}
      />
      <p className="text-sm text-muted">
        Looking to end the match or report a concern instead? That&apos;s under{" "}
        <Link href={`/match/${id}/safety`} className="focus-ring font-medium text-ink underline">
          More
        </Link>
        .
      </p>
    </div>
  );
}
