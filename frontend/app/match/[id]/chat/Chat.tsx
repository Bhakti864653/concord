"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function Chat({
  matchId,
  currentUserId,
}: {
  matchId: string;
  currentUserId: string;
}) {
  const [supabase] = useState(() => createClient());
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .eq("match_mentee_id", matchId)
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      setMessages(data ?? []);
    }
    load();

    // Realtime, not polling - Supabase pushes new rows to every subscribed
    // client the moment they're inserted (from either side, or from any
    // client - including this one's own optimistic-free insert below).
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `match_mentee_id=eq.${matchId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === next.id) ? prev : [...prev, next]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    setSending(true);
    setError(null);
    const { error } = await supabase.from("messages").insert({
      match_mentee_id: matchId,
      sender_id: currentUserId,
      body: trimmed,
    });
    setSending(false);

    if (error) {
      setError(error.message);
      return;
    }
    setBody("");
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="relative flex h-[55vh] flex-col gap-3 overflow-hidden rounded-2xl border border-line bg-paper-raised p-4">
        <div
          aria-hidden="true"
          className="concord-glow pointer-events-none absolute -right-1/3 -top-1/3 -z-10 h-[140%] w-[140%] opacity-60"
        />
        <div className="relative flex flex-1 flex-col gap-3 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-sm text-muted">No messages yet - say hello.</p>
          )}
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                    mine
                      ? "bg-ink text-paper"
                      : "border border-line bg-paper-raised text-ink"
                  }`}
                  style={
                    mine
                      ? { boxShadow: "0 4px 16px color-mix(in srgb, var(--accord-glow) 25%, transparent)" }
                      : undefined
                  }
                >
                  {m.body}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message"
          maxLength={2000}
          className="flex-1 rounded-md border border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-md bg-ink px-4 py-2 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
