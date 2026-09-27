import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import MentorJoin, { type MentorProfile } from "./MentorJoin";

/** The explicit step between "has a mentor profile" and "available on Concord". */
export default async function MentorJoinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/onboarding/mentor");

  const userType = user.user_metadata?.user_type;
  if (userType !== "mentor") redirect("/dashboard");

  const [{ data: profile }, { data: availability }] = await Promise.all([
    supabase
      .from("mentor_profiles")
      .select("user_id, mentors_in, background, background_tags, other_tag_text, availability_count, bio")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("availability").select("slots").eq("user_id", user.id).maybeSingle(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <PageHeader
        eyebrow="Mentor onboarding"
        title="Join mentorship matching."
        subtitle="Mentees can only see and rank mentors who finish these steps and choose to take part. You can stop at any time."
      />
      <MentorJoin
        userId={user.id}
        profile={(profile as MentorProfile | null) ?? null}
        initialSlots={availability?.slots ?? []}
      />
    </div>
  );
}
