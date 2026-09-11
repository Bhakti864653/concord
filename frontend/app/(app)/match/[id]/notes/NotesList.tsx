"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses } from "@/components/ui/Button";
import ContextualEmptyState from "@/components/mentorship/ContextualEmptyState";

type Note = {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export default function NotesList({
  matchId,
  currentUserId,
  partnerLabel,
  initialNotes,
}: {
  matchId: string;
  currentUserId: string;
  partnerLabel: string;
  initialNotes: Note[];
}) {
  const [supabase] = useState(() => createClient());
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("match_notes")
      .insert({ match_id: matchId, author_id: currentUserId, body: trimmed })
      .select()
      .single();
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }
    // Newest first, matching the initial server-side order.
    setNotes((prev) => [data as Note, ...prev]);
    setBody("");
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("match_notes").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleAdd}
        className="concord-lift flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-paper-raised p-5"
      >
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          <span className="sr-only">Note</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="What did you discuss? What's next?"
            className="focus-ring rounded-[var(--radius-control)] border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-mentee"
          />
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={saving || !body.trim()} className={`self-start ${buttonClasses("primary")}`}>
          {saving ? "Adding..." : "Add note"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {notes.length === 0 && (
          <ContextualEmptyState
            kind="note"
            title="No notes yet"
            description="The first one will show up here."
          />
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="concord-lift rounded-[var(--radius-card)] border-l-4 border-mentee bg-paper-raised p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-tight text-mentee">
                {n.author_id === currentUserId ? "You" : partnerLabel}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted">{new Date(n.created_at).toLocaleString()}</p>
                {n.author_id === currentUserId && (
                  <button
                    onClick={() => deleteNote(n.id)}
                    aria-label="Remove note"
                    className="focus-ring inline-flex min-h-11 items-center rounded px-1 text-xs text-muted hover:text-danger"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1.5 text-sm text-ink">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
