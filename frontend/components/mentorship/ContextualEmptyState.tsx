import Link from "next/link";
import type { ReactNode } from "react";

type EmptyKind = "match" | "goal" | "session" | "note" | "chat";

const ICON_PATHS: Record<Exclude<EmptyKind, "match">, ReactNode> = {
  goal: <path d="M12 2v6M12 22a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z" />,
  session: <path d="M3 10h18M7 3v4M17 3v4M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />,
  note: <path d="M4 4h16v16H4zM8 9h8M8 13h5" />,
  chat: <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />,
};

/**
 * Friendly empty states built from plain CSS/SVG shapes - the "match" kind
 * reuses the app's own converging-circles motif (two not-yet-overlapping
 * circles) rather than any stock illustration or icon library.
 */
export default function ContextualEmptyState({
  kind,
  title,
  description,
  action,
}: {
  kind: EmptyKind;
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line px-6 py-8 text-center">
      {kind === "match" ? (
        <svg width="56" height="40" viewBox="0 0 56 40" aria-hidden="true">
          <circle cx="20" cy="20" r="16" fill="none" stroke="var(--mentee)" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
          <circle cx="36" cy="20" r="16" fill="none" stroke="var(--mentor)" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
        </svg>
      ) : (
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-paper text-muted"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {ICON_PATHS[kind]}
          </svg>
        </span>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-medium text-ink">{title}</p>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {action && (
        <Link
          href={action.href}
          className="focus-ring flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-mentee underline"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
