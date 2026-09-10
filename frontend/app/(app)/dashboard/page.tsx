import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationBell from "@/components/NotificationBell";
import { buildJourney } from "@/lib/journey";
import RoundControl from "./RoundControl";
import JourneyPath from "./JourneyPath";
import MatchExplanation from "../match/[id]/MatchExplanation";

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

  let hasMessage = false;
  let hasOverlap = false;

  if (primaryMatch) {
    const { data: messageRows } = await supabase
      .from("messages")
      .select("id")
      .eq("match_id", primaryMatch.id)
      .limit(1);
    hasMessage = (messageRows ?? []).length > 0;

    const [{ data: ownAvailability }, { data: partnerAvailability }] = await Promise.all([
      supabase.from("availability").select("slots").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("availability")
        .select("slots")
        .eq("user_id", primaryMatch.counterpartId)
        .maybeSingle(),
    ]);
    const ownSlots = new Set(ownAvailability?.slots ?? []);
    hasOverlap = (partnerAvailability?.slots ?? []).some((slot: string) => ownSlots.has(slot));
  }

  const isAdmin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  const { data: currentRound } = await supabase
    .from("matching_rounds")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const roundStatus = currentRound?.status ?? "preferences_open";
  const isWaitlisted = preferencesLocked && !primaryMatch;

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
    hasMessage,
    hasOverlap,
  });

  const roundHeadline: Record<string, string> = {
    preferences_open: primaryMatch
      ? "Your match is set for this round."
      : "Your suggested list is ready to review.",
    preferences_locked: "Preferences are locked - matching runs soon.",
    matching_in_progress: "Matching is running right now.",
    results_available: "Results are in for this round.",
  };

  return (
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6">
      {/* One main status card: what's happening this round, and the one
          obvious next action - merges what used to be a separate header
          bar plus its own gradient card. */}
      <div className="concord-lift relative overflow-hidden rounded-[22px] bg-gradient-to-br from-mentee-glow via-mentee to-mentee p-7 text-paper-raised">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-12 h-64 w-64 rounded-full border-2 border-white/15"
        />
        <div className="relative flex items-center justify-between">
          <p className="text-xs font-extrabold uppercase tracking-widest text-paper-raised/80">
            Mentorship, thoughtfully matched
          </p>
          <NotificationBell userId={user.id} />
        </div>
        <div className="relative mt-4 flex items-center gap-2 text-sm font-bold">
          <i aria-hidden="true" className="h-2 w-2 rounded-full bg-accord-glow" />
          Round: {roundStatus.replaceAll("_", " ")}
        </div>
        <h2 className="relative mt-3 max-w-md text-[26px] font-bold leading-tight tracking-tight">
          {roundHeadline[roundStatus]}
        </h2>
        <p className="relative mt-2 max-w-md text-white/85">
          {primaryMatch
            ? "Keep the conversation moving - shared goals and a session or two go a long way."
            : "We found people who understand both where you want to go and where you're coming from."}
        </p>
        <Link
          href={primaryMatch ? `/match/${primaryMatch.id}` : "/preferences"}
          className="focus-ring relative mt-4 inline-block rounded-[var(--radius-control)] bg-paper-raised px-4 py-2.5 font-bold text-mentee"
        >
          {primaryMatch ? "Go to your match →" : "Review your ranking →"}
        </Link>
      </div>

      {/* One compact journey display. RoundControl only ever renders its
          admin button for the one admin account, so this stays invisible
          to everyone else - it's not wrapped in its own card anymore. */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-muted">YOUR JOURNEY</p>
          {isAdmin && <RoundControl status={roundStatus} isAdmin={!!isAdmin} />}
        </div>
        <JourneyPath steps={journey} />
      </div>

      {isWaitlisted && (
        <p className="text-sm text-muted">
          You&apos;re waitlisted for the next matching round - your locked preferences will be
          used automatically once it runs.
        </p>
      )}

      {/* At most 2 secondary cards. */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Link
          href="/rounds"
          className="focus-ring concord-lift rounded-[18px] border border-line bg-paper-raised p-4"
        >
          <p className="font-semibold text-ink">Rounds &amp; how matching works</p>
          <p className="mt-1 text-sm text-muted">
            Where this round stands, and how the algorithm decides matches.
          </p>
        </Link>
        {primaryMatch && (
          <Link
            href={`/match/${primaryMatch.id}/journey`}
            className="focus-ring concord-lift rounded-[18px] border border-line bg-paper-raised p-4"
          >
            <p className="font-semibold text-ink">Our plan</p>
            <p className="mt-1 text-sm text-muted">Availability, goals, sessions, and notes.</p>
          </Link>
        )}
      </div>

      {primaryMatch && <MatchExplanation matchId={primaryMatch.id} isMentee={isMentee} />}

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
