import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import MenteeRanking from "./MenteeRanking";
import MentorRanking from "./MentorRanking";
import PotentialMentors from "./PotentialMentors";
import { OPEN_ENROLLMENT_COPY } from "@/lib/invitations";
import Link from "next/link";

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

  let mentorJoined = true;
  if (userType === "mentor") {
    const { data: participation } = await supabase
      .from("mentor_profiles")
      .select("visible_to_mentees, matching_opted_in_at")
      .eq("user_id", user.id)
      .maybeSingle();
    mentorJoined = Boolean(participation?.visible_to_mentees && participation?.matching_opted_in_at);
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
      <PageHeader
        eyebrow="Your preferences"
        title="Choose who feels right."
        subtitle="We suggested this order from shared goals and lived experience. Reorder however you like, then lock it in when you're ready. You always have the final say."
      />
      {userType === "mentee" ? (
        <>
          <section aria-labelledby="available-heading" className="flex flex-col gap-4">
            <div className="flex max-w-2xl flex-col gap-1.5">
              <h2
                id="available-heading"
                className="font-display text-2xl font-semibold tracking-tight text-ink"
              >
                Available on Concord
              </h2>
              <p className="text-sm text-muted">
                These mentors have joined Concord and are currently participating in mentorship
                matching.
              </p>
            </div>
            <MenteeRanking savedOrder={savedOrder} savedLocked={savedLocked} />
          </section>
          <PotentialMentors />
          <p className="max-w-2xl text-xs text-muted">{OPEN_ENROLLMENT_COPY}</p>
        </>
      ) : (
        <>
          {!mentorJoined && (
            <p className="rounded-[var(--radius-card)] border border-mentor/30 bg-mentor-tint p-4 text-sm text-ink">
              Mentees can&apos;t see or rank you yet.{" "}
              <Link href="/onboarding/mentor" className="focus-ring rounded font-medium underline">
                Finish joining matching
              </Link>
            </p>
          )}
          <MentorRanking savedOrder={savedOrder} savedLocked={savedLocked} />
        </>
      )}
    </div>
  );
}
