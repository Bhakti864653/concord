import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const ownTable = userType === "mentee" ? "mentee_profiles" : "mentor_profiles";
  const browseTable = userType === "mentee" ? "mentor_profiles" : "mentee_profiles";

  const { data: ownProfile } = await supabase
    .from(ownTable)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownProfile) {
    redirect("/onboarding");
  }

  const { data: others } = await supabase.from(browseTable).select("*");

  const matchColumn = userType === "mentee" ? "mentee_user_id" : "mentor_user_id";
  const counterpartTable = userType === "mentee" ? "mentor_profiles" : "mentee_profiles";
  const { data: matchRow } = await supabase
    .from("matches")
    .select(userType === "mentee" ? "mentor_user_id" : "mentee_user_id")
    .eq(matchColumn, user.id)
    .maybeSingle();

  const counterpartId = matchRow
    ? userType === "mentee"
      ? (matchRow as { mentor_user_id: string }).mentor_user_id
      : (matchRow as { mentee_user_id: string }).mentee_user_id
    : null;

  const { data: matchedProfile } = counterpartId
    ? await supabase
        .from(counterpartTable)
        .select("*")
        .eq("user_id", counterpartId)
        .maybeSingle()
    : { data: null };

  const isAdmin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Welcome, {userType === "mentee" ? "mentee" : "mentor"}
        </h1>
        <div className="flex items-center gap-4">
          <Link href="/preferences" className="text-sm underline">
            Rank your {userType === "mentee" ? "mentors" : "mentees"}
          </Link>
          <LogoutButton />
        </div>
      </div>

      {isAdmin && <RunMatchButton />}

      {matchedProfile && (
        <section className="flex flex-col gap-2 rounded border-2 border-black p-4">
          <h2 className="text-sm font-medium text-gray-600">
            You&apos;ve been matched with
          </h2>
          <p className="font-medium">
            {userType === "mentee" ? matchedProfile.mentors_in : matchedProfile.seeking_guidance_on}
          </p>
          <p className="text-sm text-gray-700">{matchedProfile.bio}</p>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded border p-4">
        <h2 className="text-sm font-medium text-gray-600">Your profile</h2>
        {userType === "mentee" ? (
          <>
            <p className="font-medium">{ownProfile.seeking_guidance_on}</p>
            <p className="text-sm text-gray-700">{ownProfile.bio}</p>
          </>
        ) : (
          <>
            <p className="font-medium">{ownProfile.mentors_in}</p>
            <p className="text-sm text-gray-700">{ownProfile.bio}</p>
            <p className="text-xs text-gray-500">
              Open to {ownProfile.availability_count} mentee
              {ownProfile.availability_count === 1 ? "" : "s"}
            </p>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-gray-600">
          {userType === "mentee" ? "Mentors" : "Mentees"} on Concord
        </h2>
        {!others || others.length === 0 ? (
          <p className="text-sm text-gray-500">No one else has joined yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {others.map((p) => (
              <div key={p.user_id} className="rounded border p-4">
                <p className="font-medium">
                  {userType === "mentee" ? p.mentors_in : p.seeking_guidance_on}
                </p>
                <p className="text-sm text-gray-700">{p.bio}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
