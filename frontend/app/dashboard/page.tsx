import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import { buildJourney } from "@/lib/journey";
import LogoutButton from "./LogoutButton";
import RunMatchButton from "./RunMatchButton";
import JourneyPath from "./JourneyPath";

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

  // A mentee is matched at most once (mentee_user_id is the matches table's
  // primary key), but a mentor with availability_count > 1 can genuinely
  // have several - so this reads every match row for the current user
  // rather than assuming (and erroring on) exactly one. The journey path
  // below tracks the first one; any others are listed separately.
  const matchColumn = isMentee ? "mentee_user_id" : "mentor_user_id";
  const counterpartTable = isMentee ? "mentor_profiles" : "mentee_profiles";
  const { data: matchRows } = await supabase
    .from("matches")
    .select("mentee_user_id, mentor_user_id")
    .eq(matchColumn, user.id);

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
      // mentee_user_id doubles as the match's own id - it's unique per
      // match even for a mentor with several, since each mentee is only
      // ever matched once.
      id: m.mentee_user_id,
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
      .eq("match_mentee_id", primaryMatch.id)
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

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none absolute -right-1/3 -top-1/3 -z-10 h-[70%] w-[70%] opacity-40"
      />
      <div className="relative flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-medium text-ink">Concord</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <NotificationBell userId={user.id} />
          <LogoutButton />
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <RunMatchButton />
        </div>
      )}

      <div className="concord-lift rounded-2xl border border-line bg-paper-raised px-5 py-2">
        <JourneyPath steps={journey} />
      </div>

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
                  <Link href={`/match/${id}`} className="underline">
                    View match
                  </Link>
                  <Link href={`/match/${id}/chat`} className="underline">
                    Chat
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
