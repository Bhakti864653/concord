"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleAdd}
        className="concord-lift flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-5"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What did you discuss? What's next?"
          className="rounded-xl border border-line bg-paper px-3 py-2.5 text-sm text-ink focus:border-mentee focus:outline-none"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="self-start rounded-xl bg-mentee px-5 py-2.5 text-sm font-bold text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add note"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {notes.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-5 text-center text-sm text-muted">
            No notes yet - the first one will show up here.
          </p>
        )}
        {notes.map((n) => (
          <div
            key={n.id}
            className="concord-lift rounded-2xl border-l-4 border-mentee bg-paper-raised p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold tracking-tight text-mentee">
                {n.author_id === currentUserId ? "You" : partnerLabel}
              </p>
              <p className="text-xs text-muted">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            <p className="mt-1.5 text-sm text-ink">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
