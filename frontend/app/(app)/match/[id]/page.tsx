import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { matchReasons } from "@/lib/matchReasons";
import { requireMatch } from "@/lib/matchAuth";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";
import { buttonClasses } from "@/components/ui/Button";
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

  const icebreaker =
    reasons.sharedWords.length > 0
      ? `You both mentioned "${reasons.sharedWords[0]}" - ask them about it.`
      : reasons.sharedTags.length > 0
        ? `You both share ${TAG_LABELS.get(reasons.sharedTags[0]) ?? reasons.sharedTags[0]} - that's a good place to start.`
        : "Ask them what got them started on this path.";

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
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-8">
      <div className="relative">
        <MatchTabs id={id} active="overview" />
      </div>

      {/* A compact trail of the same journey path from the dashboard, so
          arriving here reads as reaching a milestone, not a card that
          appeared out of nowhere. */}
      <div className="match-reveal-in relative flex items-center gap-1" aria-hidden="true">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mentor text-paper">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l4 4L19 6" />
          </svg>
        </span>
        <span className="h-0.5 w-8 bg-accord-glow" />
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-mentor text-paper">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M5 12l4 4L19 6" />
          </svg>
        </span>
        <span className="h-0.5 w-8 bg-accord-glow" />
        <svg width="34" height="26" viewBox="0 0 28 24">
          <circle cx="10" cy="12" r="9" fill="var(--mentee-glow)" fillOpacity="0.7" />
          <circle cx="18" cy="12" r="9" fill="var(--mentor-glow)" fillOpacity="0.9" />
        </svg>
        <span className="h-0.5 w-8 bg-line" />
        <span className="h-7 w-7 rounded-full border-2 border-line" />
        <span className="h-0.5 w-8 bg-line" />
        <span className="h-7 w-7 rounded-full border-2 border-line" />
      </div>

      <div className="match-reveal-in relative flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <svg width="20" height="16" viewBox="0 0 28 24" aria-hidden="true">
            <circle cx="10" cy="12" r="9" fill="var(--accord-glow)" fillOpacity="0.55" />
            <circle cx="18" cy="12" r="9" fill="var(--accord-glow)" fillOpacity="0.85" />
          </svg>
          <p className="text-sm font-semibold text-accord">You&apos;ve been matched!</p>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {isMentee ? counterpart.mentors_in : counterpart.seeking_guidance_on}
        </h1>
      </div>

      {/* Plain card, not the heavy accord-green fill this used to have -
          "You've been matched!" above already carries the green signal;
          painting the whole bio block green too read as overbearing for
          what's just descriptive text. A thin counterpart-role-colored
          left border gives it identity without the weight. */}
      <section
        className={`concord-lift match-reveal-in relative flex flex-col gap-3 rounded-2xl border-l-4 bg-paper-raised p-6 ${isMentee ? "border-mentor" : "border-mentee"}`}
      >
        <p className="text-sm text-ink">{counterpart.bio}</p>

        {!isMentee && (
          <p className="text-xs text-ink/70">
            Their background: {counterpart.background}
          </p>
        )}

        {(reasons.sharedWords.length > 0 || reasons.sharedTags.length > 0) && (
          <p className="text-xs text-ink/70">
            You both mentioned{" "}
            {reasons.sharedWords.slice(0, 4).join(", ") || "similar things"}
            {reasons.sharedTags.length > 0 &&
              ` and share ${reasons.sharedTags.map((t) => TAG_LABELS.get(t) ?? t).join(", ")}`}
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

      {match.status === "ended" ? (
        <p className="relative text-sm text-muted">
          This match has ended. You&apos;ll be included in the next matching round.
        </p>
      ) : (
        <div className="relative flex items-center gap-4">
          <Link href={`/match/${id}/chat`} className={buttonClasses("primary")}>
            Start chatting
          </Link>
          <Link href={`/match/${id}/safety`} className="focus-ring text-sm text-muted underline hover:text-ink">
            More
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
