import InitialAvatar from "./InitialAvatar";

/**
 * A person's identity within a match, everywhere it's shown (match hero,
 * dashboard, chat header). The app deliberately doesn't collect real names -
 * people are identified by role + what they mentor in / seek guidance on,
 * the same model the match page's heading already used before this pass -
 * this just gives that pairing (avatar + role + topic) one reusable shape
 * instead of re-laying it out per screen.
 */
export default function MatchIdentity({
  role,
  roleLabel,
  topic,
  size = "md",
  align = "start",
}: {
  role: "mentee" | "mentor";
  roleLabel: string;
  topic: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "end";
}) {
  // Stays a centered vertical stack up through `lg`, not just below `sm` -
  // the desktop sidebar (240px) only exists from `sm` up, so at tablet
  // widths (e.g. 768px viewport) the *content* column is actually narrower
  // than many phones even though the viewport itself has cleared `sm`.
  // `lg` (1024px) is the first breakpoint wide enough to have real room
  // left over after the sidebar. Side by side with a reversed/right-aligned
  // "end" variant only has room once the hero itself goes side-by-side too
  // (see match/[id]/page.tsx's flex-col lg:flex-row on the row that holds
  // both identities).
  return (
    <div
      className={`flex flex-col items-center gap-2 text-center lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:gap-3 lg:text-left ${
        align === "end" ? "lg:flex-row-reverse lg:text-right" : ""
      }`}
    >
      <InitialAvatar label={topic} role={role} size={size} />
      <div className="flex min-w-0 max-w-[160px] flex-col lg:max-w-none">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{roleLabel}</p>
        <p className="truncate font-display text-base font-semibold text-ink">{topic}</p>
      </div>
    </div>
  );
}
