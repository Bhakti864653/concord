import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { matchReasons } from "@/lib/matchReasons";
import { requireMatch } from "@/lib/matchAuth";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";
import { computeNextAction } from "@/lib/nextAction";
import { loadMatchProgress } from "@/lib/matchProgress";
import { buildIcebreaker } from "@/lib/icebreaker";
import MatchIdentity from "@/components/mentorship/MatchIdentity";
import NextActionCard from "@/components/mentorship/NextActionCard";
import MatchReasonChips, { type MatchReasonChip } from "@/components/mentorship/MatchReasonChips";
import MatchExplanation from "./MatchExplanation";
import MatchTabs from "./MatchTabs";

const TAG_LABELS = new Map(CIRCUMSTANCE_TAGS.map((t) => [t.value, t.label]));

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, match } = await requireMatch(supabase, id);

  const userType = user.user_metadata?.user_type as "mentee" | "mentor" | undefined;
  if (userType !== "mentee" && userType !== "mentor") {
    redirect("/login");
  }

  const isMentee = userType === "mentee";
  const ownTable = isMentee ? "mentee_profiles" : "mentor_profiles";
  const counterpartTable = isMentee ? "mentor_profiles" : "mentee_profiles";
  const counterpartId = isMentee ? match.mentor_user_id : match.mentee_user_id;

  const [{ data: ownProfile }, { data: counterpart }] = await Promise.all([
    supabase.from(ownTable).select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from(counterpartTable).select("*").eq("user_id", counterpartId).maybeSingle(),
  ]);

  if (!ownProfile || !counterpart) {
    redirect("/dashboard");
  }

  const reasons = matchReasons(
    isMentee ? ownProfile.seeking_guidance_on : counterpart.seeking_guidance_on,
    isMentee ? ownProfile.other_tag_text : counterpart.other_tag_text,
    (isMentee ? ownProfile.circumstance_tags : counterpart.circumstance_tags) ?? [],
    isMentee ? counterpart.mentors_in : ownProfile.mentors_in,
    isMentee ? counterpart.other_tag_text : ownProfile.other_tag_text,
    (isMentee ? counterpart.background_tags : ownProfile.background_tags) ?? [],
  );

  const icebreaker = buildIcebreaker(reasons);

  // Same state signals the dashboard uses for its own NextActionCard, kept
  // in sync via the shared loader/computeNextAction() so the two screens
  // never disagree about what to do next.
  const progress = await loadMatchProgress(supabase, id, user.id, counterpartId);
  const nextAction = computeNextAction(id, {
    hasMessage: progress.hasMessage,
    hasOverlap: progress.hasOverlap,
    hasGoal: progress.goalsTotal > 0,
    hasUpcomingSession: progress.hasUpcomingSession,
    hasPendingCheckin: progress.hasPendingCheckin,
  });

  const ownTopic = isMentee ? ownProfile.seeking_guidance_on : ownProfile.mentors_in;
  const counterpartTopic = isMentee ? counterpart.mentors_in : counterpart.seeking_guidance_on;

  const reasonChips: MatchReasonChip[] = [
    ...reasons.sharedWords.slice(0, 2).map((w) => ({ label: w, tone: "accord" as const })),
    ...reasons.sharedTags.slice(0, 1).map((t) => ({
      label: TAG_LABELS.get(t) ?? t,
      tone: "mentor" as const,
    })),
  ].slice(0, 3);

  return (
    // The glow lives on this full-width, unclipped-at-the-content-edge
    // wrapper rather than on the narrow max-w-2xl reading column below -
    // clipping it to that column's own bounds gave it a hard, visible
    // rectangular edge instead of fading into the page. `overflow-hidden`
    // here still stops the oversized glow div from causing horizontal
    // scroll, but the clip boundary now sits at the actual content pane's
    // edge, not partway across it.
    <div className="relative w-full overflow-hidden">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none fixed inset-0 -z-10"
      />
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="relative">
          <MatchTabs id={id} active="overview" />
        </div>

        {/* The signature moment: two paths (mentee/mentor) meeting in the
            middle. Same circle-pair motif used everywhere else in the app
            (JourneyPath's milestone node, the landing-page preview), just
            given room to be the main event here instead of a small icon. */}
        <section className="match-reveal-in concord-lift relative flex flex-col items-center gap-5 rounded-[28px] bg-paper-raised px-5 py-7 sm:px-8">
          <div className="flex w-full flex-col items-center gap-4 lg:flex-row lg:justify-between lg:gap-8">
            <MatchIdentity
              role={userType}
              roleLabel="You"
              topic={ownTopic}
              size="lg"
              align="start"
            />
            <svg width="44" height="34" viewBox="0 0 28 24" aria-hidden="true" className="shrink-0">
              <circle className="converge-left" cx="10" cy="12" r="9" fill="var(--mentee-glow)" fillOpacity="0.75" />
              <circle className="converge-right" cx="18" cy="12" r="9" fill="var(--mentor-glow)" fillOpacity="0.9" />
            </svg>
            <MatchIdentity
              role={isMentee ? "mentor" : "mentee"}
              roleLabel={isMentee ? "Your mentor" : "Your mentee"}
              topic={counterpartTopic}
              size="lg"
              align="end"
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-accord text-paper"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l4 4L19 6" />
              </svg>
            </span>
            <h1 className="font-display text-lg font-semibold tracking-tight text-ink">
              You&apos;ve been matched!
            </h1>
          </div>

          <MatchReasonChips reasons={reasonChips} />
        </section>

        {match.status === "ended" ? (
          <p className="text-sm text-muted">
            This match has ended. You&apos;ll be included in the next matching round.
          </p>
        ) : (
          <NextActionCard action={nextAction} />
        )}

        {/* Plain card, not the heavy accord-green fill this used to have -
            "You've been matched!" above already carries the green signal;
            painting the whole bio block green too read as overbearing for
            what's just descriptive text. A thin counterpart-role-colored
            left border gives it identity without the weight. */}
        <section
          className={`concord-lift relative flex flex-col gap-3 rounded-2xl border-l-4 bg-paper-raised p-6 ${isMentee ? "border-mentor" : "border-mentee"}`}
        >
          <p className="text-sm text-ink">{counterpart.bio}</p>

          {!isMentee && (
            <p className="text-xs text-ink/70">
              Their background: {counterpart.background}
            </p>
          )}
        </section>

        <section className="concord-lift relative flex flex-col gap-2 rounded-2xl border-l-4 border-mentee bg-paper-raised p-4">
          <h2 className="text-sm font-medium text-muted">Icebreaker</h2>
          <p className="text-sm text-ink">{icebreaker}</p>
        </section>

        <div className="relative">
          <MatchExplanation matchId={id} isMentee={isMentee} />
        </div>

        {match.status !== "ended" && (
          <Link href={`/match/${id}/safety`} className="focus-ring self-start text-sm text-muted underline hover:text-ink">
            More
          </Link>
        )}
      </div>
    </div>
  );
}
