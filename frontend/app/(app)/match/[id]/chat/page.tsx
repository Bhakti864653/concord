import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import Chat from "./Chat";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user } = await requireMatch(supabase, id);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <MatchTabs id={id} active="chat" />
      <Chat matchId={id} currentUserId={user.id} />
    </div>
  );
}
