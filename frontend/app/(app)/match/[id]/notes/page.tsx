import { createClient } from "@/lib/supabase/server";
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
    .eq("match_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-4 overflow-hidden">
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
    </div>
  );
}
