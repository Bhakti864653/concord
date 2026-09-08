import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    <div className="mx-auto flex w-full max-w-[1220px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-extrabold uppercase tracking-widest text-mentee">
          Your preferences
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Choose who feels right.
        </h1>
        <p className="max-w-lg text-sm text-muted">
          We suggested this order from shared goals and lived experience. Reorder however you
          like, then lock it in when you&apos;re ready. You always have the final say.
        </p>
      </div>
      {userType === "mentee" ? (
        <MenteeRanking savedOrder={savedOrder} savedLocked={savedLocked} />
      ) : (
        <MentorRanking savedOrder={savedOrder} savedLocked={savedLocked} />
      )}
    </div>
  );
}
