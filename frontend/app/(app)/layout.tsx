import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userType = user.user_metadata?.user_type as "mentee" | "mentor" | undefined;
  const isAdmin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();

  let primaryMatchId: string | null = null;
  let profileComplete = false;

  if (userType === "mentee" || userType === "mentor") {
    const ownTable = userType === "mentee" ? "mentee_profiles" : "mentor_profiles";
    const { data: ownProfile } = await supabase
      .from(ownTable)
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    profileComplete = !!ownProfile;

    const matchColumn = userType === "mentee" ? "mentee_user_id" : "mentor_user_id";
    const { data: matchRows } = await supabase
      .from("matches")
      .select("id")
      .eq(matchColumn, user.id)
      .eq("status", "active")
      .limit(1);
    primaryMatchId = matchRows?.[0]?.id ?? null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1400px]">
      <Sidebar primaryMatchId={primaryMatchId} isAdmin={!!isAdmin} profileComplete={profileComplete} />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-8 sm:pb-10">{children}</main>
      <MobileNav primaryMatchId={primaryMatchId} />
    </div>
  );
}
