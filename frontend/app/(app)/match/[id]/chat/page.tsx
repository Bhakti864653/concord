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
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">Chat</h1>
        <p className="text-sm text-muted">
          Real-time messages between just the two of you - nothing here is visible to anyone else.
        </p>
      </div>
      <Chat matchId={id} currentUserId={user.id} />
    </div>
  );
}
