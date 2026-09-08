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

function describe(kind: string): { title: string; icon: string } {
  if (kind === "match_created") return { title: "Your match is ready", icon: "✦" };
  if (kind === "new_message") return { title: "New message", icon: "◫" };
  return { title: kind, icon: "♧" };
}

export default function NotificationsFeed({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: Notification[];
}) {
  const [supabase] = useState(() => createClient());
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-feed:${userId}`)
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
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  async function markAllRead() {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const readAt = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: readAt }).in("id", unreadIds);
    setNotifications((prev) =>
      prev.map((n) => (unreadIds.includes(n.id) ? { ...n, read_at: readAt } : n)),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          onClick={markAllRead}
          className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink hover:opacity-70"
        >
          Mark all as read
        </button>
      </div>
      <div className="concord-lift flex flex-col gap-2 rounded-2xl border border-line bg-paper-raised p-2">
        {notifications.length === 0 && (
          <p className="p-4 text-sm text-muted">No notifications yet.</p>
        )}
        {notifications.map((n) => {
          const { title, icon } = describe(n.kind);
          return (
            <Link
              key={n.id}
              href={n.payload.match_mentee_id ? `/match/${n.payload.match_mentee_id}` : "/dashboard"}
              className={`flex items-center gap-3 rounded-xl p-3 ${!n.read_at ? "bg-mentee-tint" : "hover:bg-paper"}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mentee-tint text-mentee">
                {icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{title}</p>
                <p className="text-xs text-muted">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
