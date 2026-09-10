import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import NotificationsFeed from "./NotificationsFeed";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, kind, payload, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="The updates that matter."
        subtitle="Messages, matching-round changes, and match updates in one calm feed."
      />
      <NotificationsFeed userId={user.id} initialNotifications={notifications ?? []} />
    </div>
  );
}
