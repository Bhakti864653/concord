import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import RematchButton from "../RematchButton";
import ReportButton from "../ReportButton";

export default async function SafetyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { match } = await requireMatch(supabase, id);

  return (
    <div className="flex flex-col gap-4">
      <MatchTabs id={id} active="safety" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          You are always in control.
        </h1>
        <p className="text-sm text-muted">
          Get support, report a concern, or leave a match without needing to confront the other
          person.
        </p>
      </div>

      {match.status === "ended" ? (
        <p className="text-sm text-muted">This match has already ended.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="concord-lift flex flex-col gap-2 rounded-2xl border border-line bg-paper-raised p-5">
            <h2 className="font-medium text-ink">Request a private rematch</h2>
            <p className="text-sm text-muted">
              Choose a reason. Your partner will only be told that the match ended - never your
              reason.
            </p>
            <RematchButton matchId={id} />
          </div>
          <div className="concord-lift flex flex-col gap-2 rounded-2xl border border-mentor/40 bg-mentor-tint p-5">
            <h2 className="font-medium text-ink">Immediate safety action</h2>
            <p className="text-sm text-muted">
              Block, report, or end the match immediately. Reports are securely logged for
              review.
            </p>
            <ReportButton matchId={id} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/community-guidelines"
          className="concord-lift rounded-2xl border border-line bg-paper-raised p-4"
        >
          <p className="font-medium text-ink">Community guidelines</p>
          <p className="mt-1 text-sm text-muted">
            Clear expectations for respectful and appropriate mentorship.
          </p>
        </Link>
        <Link
          href={`/match/${id}/chat`}
          className="concord-lift rounded-2xl border border-line bg-paper-raised p-4"
        >
          <p className="font-medium text-ink">Report a message</p>
          <p className="mt-1 text-sm text-muted">
            Use the &quot;Report&quot; link beside any chat message to flag it for review.
          </p>
        </Link>
        <div className="concord-lift rounded-2xl border border-line bg-paper-raised p-4">
          <p className="font-medium text-ink">Privacy</p>
          <p className="mt-1 text-sm text-muted">
            Only what you added to your profile is ever shared with a match.
          </p>
        </div>
      </div>
    </div>
  );
}
