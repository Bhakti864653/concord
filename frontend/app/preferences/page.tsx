import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import MenteeRanking from "./MenteeRanking";
import MentorRanking from "./MentorRanking";

export default async function PreferencesPage() {
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

  const ownProfileTable = userType === "mentee" ? "mentee_profiles" : "mentor_profiles";
  const { data: ownProfile } = await supabase
    .from(ownProfileTable)
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ownProfile) {
    redirect("/onboarding");
  }

  const preferencesTable =
    userType === "mentee" ? "mentee_preferences" : "mentor_preferences";
  const idColumn = userType === "mentee" ? "ranked_mentor_ids" : "ranked_mentee_ids";

  const { data: saved } = await supabase
    .from(preferencesTable)
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const savedOrder: string[] = saved?.[idColumn] ?? [];
  const savedLocked: boolean = saved?.locked ?? false;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-medium text-ink">Concord</span>
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-ink">
          Rank your {userType === "mentee" ? "mentors" : "mentees"}
        </h1>
        <p className="text-sm text-muted">
          We suggested an order based on how well your profiles overlap.
          Reorder however you like, then lock it in when you&apos;re ready.
        </p>
      </div>
      {userType === "mentee" ? (
        <MenteeRanking savedOrder={savedOrder} savedLocked={savedLocked} />
      ) : (
        <MentorRanking savedOrder={savedOrder} savedLocked={savedLocked} />
      )}
    </main>
  );
}
