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
  // Below sm, always a centered vertical stack regardless of `align` - side
  // by side with a reversed/right-aligned "end" variant only has room once
  // the hero itself goes side-by-side too (see match/[id]/page.tsx's
  // flex-col sm:flex-row on the row that holds both identities).
  return (
    <div
      className={`flex flex-col items-center gap-2 text-center sm:min-w-0 sm:flex-1 sm:flex-row sm:items-center sm:gap-3 sm:text-left ${
        align === "end" ? "sm:flex-row-reverse sm:text-right" : ""
      }`}
    >
      <InitialAvatar label={topic} role={role} size={size} />
      <div className="flex min-w-0 max-w-[160px] flex-col sm:max-w-none">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">{roleLabel}</p>
        <p className="truncate font-display text-base font-semibold text-ink">{topic}</p>
      </div>
    </div>
  );
}
