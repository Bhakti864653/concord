import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MenteeProfileForm from "./MenteeProfileForm";
import MentorProfileForm from "./MentorProfileForm";

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userType = user.user_metadata?.user_type as "mentee" | "mentor" | undefined;
  if (userType !== "mentee" && userType !== "mentor") {
    // Shouldn't happen via the normal signup flow, but fail safe rather than
    // crash on an unexpected/missing user_type.
    redirect("/login");
  }

  const table = userType === "mentee" ? "mentee_profiles" : "mentor_profiles";
  const { data: existing } = await supabase
    .from(table)
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect("/dashboard");
  }

  const roleColor = userType === "mentee" ? "border-mentee" : "border-mentor";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center gap-6 p-6">
      <div className={`flex flex-col gap-1 border-l-4 pl-4 ${roleColor}`}>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          Set up your {userType === "mentee" ? "mentee" : "mentor"} profile
        </h1>
        <p className="text-sm text-muted">
          This is what the other side sees when you&apos;re matched.
        </p>
      </div>
      {userType === "mentee" ? <MenteeProfileForm /> : <MentorProfileForm />}
    </main>
  );
}
