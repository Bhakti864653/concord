import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
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
      <MatchTabs id={id} active="more" />
      <PageHeader
        title="You are always in control."
        subtitle="Get support, report a concern, or leave a match without needing to confront the other person."
      />

      {match.status === "ended" ? (
        <p className="text-sm text-muted">This match has already ended.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="flex flex-col gap-2">
            <h2 className="font-medium text-ink">Request a private rematch</h2>
            <p className="text-sm text-muted">
              Choose a reason. Your partner will only be told that the match ended - never your
              reason.
            </p>
            <RematchButton matchId={id} />
          </Card>
          {/* Not the shared Card component here on purpose - it needs a
              warning border/background that overrides Card's default
              border-line/bg-paper-raised, and Tailwind utility ordering
              doesn't reliably let a passed-in className win that fight. */}
          <div className="concord-lift flex flex-col gap-2 rounded-[var(--radius-card)] border border-danger/40 bg-danger-tint p-6">
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
        <Link href="/community-guidelines" className="focus-ring rounded-[var(--radius-card)]">
          <Card>
            <p className="font-medium text-ink">Community guidelines</p>
            <p className="mt-1 text-sm text-muted">
              Clear expectations for respectful and appropriate mentorship.
            </p>
          </Card>
        </Link>
        <Link href={`/match/${id}/chat`} className="focus-ring rounded-[var(--radius-card)]">
          <Card>
            <p className="font-medium text-ink">Report a message</p>
            <p className="mt-1 text-sm text-muted">
              Use the &quot;Report&quot; link beside any chat message to flag it for review.
            </p>
          </Card>
        </Link>
        <Card>
          <p className="font-medium text-ink">Privacy</p>
          <p className="mt-1 text-sm text-muted">
            Only what you added to your profile is ever shared with a match.
          </p>
        </Card>
      </div>
    </div>
  );
}
