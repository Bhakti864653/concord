import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/ui/PageHeader";
import InvitationsView from "./InvitationsView";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; field?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <PageHeader
        eyebrow="Invitations"
        title="Invite someone to mentor."
        subtitle="Know someone who could help? Send them a private link to learn about Concord. An invitation is not a match: they decide whether to join, and matching still happens through the normal rounds."
      />
      <InvitationsView
        startOpen={params.new === "1"}
        prefillField={params.field?.slice(0, 120) ?? ""}
      />
    </div>
  );
}
