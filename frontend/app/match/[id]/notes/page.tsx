import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import NotesList from "./NotesList";

export default async function NotesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, match } = await requireMatch(supabase, id);

  const isMentee = user.id === match.mentee_user_id;
  const partnerLabel = isMentee ? "Your mentor" : "Your mentee";

  const { data: notes } = await supabase
    .from("match_notes")
    .select("id, author_id, body, created_at")
    .eq("match_mentee_id", id)
    .order("created_at", { ascending: false });

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-4 overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none absolute -right-1/3 -top-1/4 -z-10 h-[70%] w-[70%] opacity-40"
      />
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <MatchTabs id={id} active="notes" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Session notes
        </h1>
        <p className="text-sm text-muted">
          A shared space to jot down what you covered and what&apos;s next.
        </p>
      </div>
      <NotesList
        matchId={id}
        currentUserId={user.id}
        partnerLabel={partnerLabel}
        initialNotes={notes ?? []}
      />
    </main>
  );
}
