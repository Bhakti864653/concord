"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  kind: string;
  payload: { match_mentee_id?: string };
  read_at: string | null;
  created_at: string;
};

function describe(kind: string): string {
  if (kind === "match_created") return "You've been matched!";
  if (kind === "new_message") return "New message";
  return kind;
}

export default function NotificationBell({ userId }: { userId: string }) {
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("id, kind, payload, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (active) setNotifications(data ?? []);
    }
    load();

    // Both match-created and new-message notifications are written by
    // database triggers (see schema.sql), not app code, so this fires
    // regardless of what actually caused the underlying insert.
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);

  async function handleToggle() {
    const wasOpen = open;
    setOpen(!wasOpen);
    if (wasOpen || unreadIds.length === 0) return;

    const readAt = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: readAt }).in("id", unreadIds);
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: readAt } : n)),
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink"
      >
        Notifications
        {unreadIds.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accord px-1 text-[10px] font-medium text-paper">
            {unreadIds.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-line bg-paper-raised p-2">
          {notifications.length === 0 && (
            <p className="p-2 text-sm text-muted">No notifications yet.</p>
          )}
          {notifications.slice(0, 10).map((n) => (
            <Link
              key={n.id}
              href={n.payload.match_mentee_id ? `/match/${n.payload.match_mentee_id}` : "/dashboard"}
              onClick={() => setOpen(false)}
              className="block rounded-md p-2 text-sm text-ink hover:bg-paper"
            >
              {describe(n.kind)}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
