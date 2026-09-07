import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import NotificationBell from "@/components/NotificationBell";
import LogoutButton from "./LogoutButton";
import RunMatchButton from "./RunMatchButton";

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
  const browseTable = isMentee ? "mentor_profiles" : "mentee_profiles";

  const { data: ownProfile } = await supabase
    .from(ownTable)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownProfile) {
    redirect("/onboarding");
  }

  const { data: others } = await supabase.from(browseTable).select("*");

  // A mentee is matched at most once (mentee_user_id is the matches table's
  // primary key), but a mentor with availability_count > 1 can genuinely
  // have several - so this reads every match row for the current user
  // rather than assuming (and erroring on) exactly one.
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
      profile: profileByUserId.get(isMentee ? m.mentor_user_id : m.mentee_user_id),
    }))
    .filter((m): m is { id: string; profile: NonNullable<typeof m.profile> } => !!m.profile);

  const isAdmin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo />
          <span className="font-display font-medium text-ink">Concord</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <NotificationBell userId={user.id} />
          <Link href="/preferences" className="font-medium text-ink underline">
            Rank your {isMentee ? "mentors" : "mentees"}
          </Link>
          <LogoutButton />
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <RunMatchButton />
        </div>
      )}

      {matches.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">
            {matches.length === 1 ? "You've been matched" : `Your ${matches.length} matches`}
          </h2>
          <div className="flex flex-col gap-3">
            {matches.map(({ id, profile }) => (
              <div
                key={id}
                className="flex items-center justify-between rounded-lg border border-accord bg-accord-tint p-4"
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

      <section
        className={`flex flex-col gap-2 rounded-lg border-l-4 bg-paper-raised p-4 ${
          isMentee ? "border-mentee" : "border-mentor"
        }`}
      >
        <h2 className="text-sm font-medium text-muted">Your profile</h2>
        {isMentee ? (
          <>
            <p className="font-medium text-ink">{ownProfile.seeking_guidance_on}</p>
            <p className="text-sm text-muted">{ownProfile.bio}</p>
          </>
        ) : (
          <>
            <p className="font-medium text-ink">{ownProfile.mentors_in}</p>
            <p className="text-sm text-muted">{ownProfile.bio}</p>
            <p className="text-xs text-muted">
              Open to {ownProfile.availability_count} mentee
              {ownProfile.availability_count === 1 ? "" : "s"}
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">
          {isMentee ? "Mentors" : "Mentees"} on Concord
        </h2>
        {!others || others.length === 0 ? (
          <p className="text-sm text-muted">No one else has joined yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {others.map((p) => (
              <div
                key={p.user_id}
                className={`rounded-lg border-l-4 bg-paper-raised p-4 ${
                  isMentee ? "border-mentor" : "border-mentee"
                }`}
              >
                <p className="font-medium text-ink">
                  {isMentee ? p.mentors_in : p.seeking_guidance_on}
                </p>
                <p className="text-sm text-muted">{p.bio}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
