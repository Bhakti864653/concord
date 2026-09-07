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
      .insert({ match_mentee_id: matchId, author_id: currentUserId, body: trimmed })
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
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="What did you discuss? What's next?"
          className="rounded-md border border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-none"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={saving || !body.trim()}
          className="self-start rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add note"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="concord-lift rounded-xl border border-line bg-paper-raised p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-tight text-ink">
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
