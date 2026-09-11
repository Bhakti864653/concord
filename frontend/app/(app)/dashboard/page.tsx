import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationBell from "@/components/NotificationBell";
import { buildJourney } from "@/lib/journey";
import { computeNextAction } from "@/lib/nextAction";
import { loadMatchProgress } from "@/lib/matchProgress";
import MatchIdentity from "@/components/mentorship/MatchIdentity";
import NextActionCard from "@/components/mentorship/NextActionCard";
import RoundControl from "./RoundControl";
import JourneyPath from "./JourneyPath";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userType = user.user_metadata?.user_type as "mentee" | "mentor" | undefined;
  if (userType !== "mentee" && userType !== "mentor") {
    redirect("/login");
  }

  const isMentee = userType === "mentee";
  const ownTable = isMentee ? "mentee_profiles" : "mentor_profiles";

  const { data: ownProfile } = await supabase
    .from(ownTable)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownProfile) {
    redirect("/onboarding");
  }

  const preferencesTable = isMentee ? "mentee_preferences" : "mentor_preferences";
  const { data: preferences } = await supabase
    .from(preferencesTable)
    .select("locked")
    .eq("user_id", user.id)
    .maybeSingle();
  const preferencesLocked = preferences?.locked ?? false;

  // A mentee has at most one *active* match at a time (a partial unique
  // index on matches enforces this), but a mentor with availability_count
  // > 1 can genuinely have several - so this reads every match row for the
  // current user rather than assuming (and erroring on) exactly one. The
  // journey path below tracks the first one; any others are listed
  // separately.
  const matchColumn = isMentee ? "mentee_user_id" : "mentor_user_id";
  const counterpartTable = isMentee ? "mentor_profiles" : "mentee_profiles";
  const { data: matchRows } = await supabase
    .from("matches")
    .select("id, mentee_user_id, mentor_user_id")
    .eq(matchColumn, user.id)
    .eq("status", "active");

  const counterpartIds = (matchRows ?? []).map((m) =>
    isMentee ? m.mentor_user_id : m.mentee_user_id,
  );

  const { data: matchedProfiles } =
    counterpartIds.length > 0
      ? await supabase.from(counterpartTable).select("*").in("user_id", counterpartIds)
      : { data: [] };

  const profileByUserId = new Map((matchedProfiles ?? []).map((p) => [p.user_id, p]));

  const matches = (matchRows ?? [])
    .map((m) => ({
      id: m.id,
      counterpartId: isMentee ? m.mentor_user_id : m.mentee_user_id,
      profile: profileByUserId.get(isMentee ? m.mentor_user_id : m.mentee_user_id),
    }))
    .filter(
      (m): m is { id: string; counterpartId: string; profile: NonNullable<typeof m.profile> } =>
        !!m.profile,
    );

  const primaryMatch = matches[0] ?? null;
  const otherMatches = matches.slice(1);

  const progress = primaryMatch
    ? await loadMatchProgress(supabase, primaryMatch.id, user.id, primaryMatch.counterpartId)
    : null;

  const nextAction =
    primaryMatch && progress
      ? computeNextAction(primaryMatch.id, {
          hasMessage: progress.hasMessage,
          hasOverlap: progress.hasOverlap,
          hasGoal: progress.goalsTotal > 0,
          hasUpcomingSession: progress.hasUpcomingSession,
          hasPendingCheckin: progress.hasPendingCheckin,
        })
      : null;

  const isAdmin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  const { data: currentRound } = await supabase
    .from("matching_rounds")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const roundStatus = currentRound?.status ?? "preferences_open";
  const isWaitlisted = preferencesLocked && !primaryMatch;

  // Only shown on the no-match hero below, and only when there's actually
  // something round-specific worth saying - "preferences_open" is the
  // default steady state and isn't worth a headline of its own.
  const roundHeadline: Record<string, string> = {
    preferences_locked: "Preferences are locked - matching runs soon.",
    matching_in_progress: "Matching is running right now.",
    results_available: "Results are in for this round.",
  };

  const journey = buildJourney({
    ownProfileSummary: isMentee ? ownProfile.seeking_guidance_on : ownProfile.mentors_in,
    preferencesLocked,
    matched: !!primaryMatch,
    matchId: primaryMatch?.id ?? null,
    counterpartSummary: primaryMatch
      ? isMentee
        ? primaryMatch.profile.mentors_in
        : primaryMatch.profile.seeking_guidance_on
      : null,
    hasMessage: progress?.hasMessage ?? false,
    hasOverlap: progress?.hasOverlap ?? false,
  });

  const ownTopic = isMentee ? ownProfile.seeking_guidance_on : ownProfile.mentors_in;
  const counterpartTopic = primaryMatch
    ? isMentee
      ? primaryMatch.profile.mentors_in
      : primaryMatch.profile.seeking_guidance_on
    : null;

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6">
      {/* Contextual heading - answers "what should I do today," not a
          restatement of round status (that still lives just below, smaller,
          only when there's actually something round-related to say). */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-muted">{greeting()}.</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {primaryMatch
              ? "Here's where things stand with your match."
              : preferencesLocked
                ? "You're locked in for this round."
                : "Let's get your preferences ranked."}
          </h1>
        </div>
        <NotificationBell userId={user.id} />
      </div>

      {primaryMatch && counterpartTopic && (
        <div className="concord-lift flex flex-col gap-4 rounded-[22px] border border-line bg-paper-raised p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MatchIdentity
              role={isMentee ? "mentor" : "mentee"}
              roleLabel={isMentee ? "Your mentor" : "Your mentee"}
              topic={counterpartTopic}
              size="md"
            />
            <Link
              href={`/match/${primaryMatch.id}`}
              className="focus-ring text-sm font-medium text-mentee underline"
            >
              View match →
            </Link>
          </div>

          {nextAction && <NextActionCard action={nextAction} />}

          {/* Upcoming session + goal progress, only when there's something
              real to show - no placeholder/zero-state clutter here, that's
              what Our Plan's own empty states are for. */}
          {(progress?.nextSession || (progress && progress.goalsTotal > 0)) && (
            <div className="flex flex-col gap-2 border-t border-line pt-4 text-sm text-ink sm:flex-row sm:gap-6">
              {progress?.nextSession && (
                <p className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 10h18M7 3v4M17 3v4M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                  </svg>
                  Next session:{" "}
                  <span className="font-medium">
                    {new Date(progress.nextSession.scheduled_for).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              )}
              {progress && progress.goalsTotal > 0 && (
                <p className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 2v6M12 22a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z" />
                  </svg>
                  {progress.milestonesTotal > 0
                    ? `${progress.milestonesDone} of ${progress.milestonesTotal} milestones done`
                    : `${progress.goalsTotal} shared goal${progress.goalsTotal === 1 ? "" : "s"} set`}
                </p>
              )}
              <Link
                href={`/match/${primaryMatch.id}/journey`}
                className="focus-ring text-sm font-medium text-mentee underline sm:ml-auto"
              >
                Our plan →
              </Link>
            </div>
          )}
        </div>
      )}

      {!primaryMatch && (
        <Link
          href="/preferences"
          className="focus-ring concord-lift relative overflow-hidden rounded-[22px] bg-gradient-to-br from-mentee-glow via-mentee to-mentee p-7 text-paper-raised"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-12 h-64 w-64 rounded-full border-2 border-white/15"
          />
          {roundHeadline[roundStatus] && (
            <p className="relative text-xs font-extrabold uppercase tracking-widest text-paper-raised/80">
              {roundHeadline[roundStatus]}
            </p>
          )}
          <p className="relative mt-1 max-w-md text-[22px] font-bold leading-tight tracking-tight">
            {ownTopic}
          </p>
          <p className="relative mt-2 max-w-md text-white/85">
            We found people who understand both where you want to go and where you&apos;re coming
            from.
          </p>
          <span className="relative mt-4 inline-block rounded-[var(--radius-control)] bg-paper-raised px-4 py-2.5 font-bold text-mentee">
            Review your ranking →
          </span>
        </Link>
      )}

      {/* One compact journey display. RoundControl only ever renders its
          admin button for the one admin account, so this stays invisible
          to everyone else - it's not wrapped in its own card anymore. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-muted">YOUR JOURNEY</h2>
          {isAdmin && <RoundControl status={roundStatus} isAdmin={!!isAdmin} />}
        </div>
        <JourneyPath steps={journey} />
        {/* A plain text link, not the big equal-weight card this used to be -
            but still needed here: the sidebar's "Rounds & waitlist" link is
            desktop-only, and MobileNav doesn't carry it either, so this is
            the only way mobile users reach /rounds at all. */}
        <Link href="/rounds" className="focus-ring self-start text-xs font-medium text-muted underline hover:text-ink">
          Rounds &amp; how matching works →
        </Link>
      </div>

      {isWaitlisted && (
        <p className="text-sm text-muted">
          You&apos;re waitlisted for the next matching round - your locked preferences will be
          used automatically once it runs.
        </p>
      )}

      {otherMatches.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">
            {otherMatches.length === 1 ? "Also matched with" : `${otherMatches.length} more matches`}
          </h2>
          <div className="flex flex-col gap-3">
            {otherMatches.map(({ id, profile }) => (
              <div
                key={id}
                className="concord-lift flex items-center justify-between rounded-xl border border-accord bg-accord-tint p-4"
              >
                <p className="font-medium text-ink">
                  {isMentee ? profile.mentors_in : profile.seeking_guidance_on}
                </p>
                <div className="flex items-center gap-4 text-sm font-medium text-ink">
                  <Link href={`/match/${id}`} className="focus-ring underline">
                    View match
                  </Link>
                  <Link href={`/match/${id}/chat`} className="focus-ring underline">
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
