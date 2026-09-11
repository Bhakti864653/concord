import Link from "next/link";
import type { ReactNode } from "react";
import type { NextAction } from "@/lib/nextAction";

const ICONS: Record<NextAction["key"], ReactNode> = {
  message: (
    <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  ),
  availability: <path d="M3 10h18M7 3v4M17 3v4M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />,
  goal: <path d="M12 2v6M12 22a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z" />,
  session: <path d="M3 10h18M7 3v4M17 3v4M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />,
  checkin: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />,
  keepgoing: (
    <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
  ),
};

/**
 * The one dominant, state-aware call to action on the match overview and
 * dashboard - computed by lib/nextAction.ts so both screens agree. Sized
 * and styled to read as *the* thing to do, not one card among equals.
 */
export default function NextActionCard({ action }: { action: NextAction }) {
  return (
    <Link
      href={action.href}
      className="focus-ring concord-lift group flex min-h-[44px] items-center gap-4 rounded-2xl bg-ink px-5 py-4 text-paper motion-safe:transition-transform motion-safe:hover:-translate-y-0.5"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper/15"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {ICONS[action.key]}
        </svg>
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-display text-base font-semibold">{action.label}</span>
        <span className="truncate text-sm text-paper/75">{action.description}</span>
      </span>
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-auto shrink-0 motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
