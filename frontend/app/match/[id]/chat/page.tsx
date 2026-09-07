import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
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
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <MatchTabs id={id} active="chat" />
      <Chat matchId={id} currentUserId={user.id} />
    </main>
  );
}
