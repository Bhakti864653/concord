import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "mentee" | "mentor" | "accord";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "border-line bg-paper text-muted",
  mentee: "border-mentee/30 bg-mentee-tint text-mentee",
  mentor: "border-mentor/30 bg-mentor-tint text-mentor",
  accord: "border-accord/30 bg-accord-tint text-accord",
};

interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
}

/** The small rounded status-pill treatment used for round status, match
 * status, and similar labels - centralized so tone/spacing stays
 * consistent across dashboard/rounds/admin instead of each inlining its
 * own pill classes. `accord` (green) is reserved for actual matched/
 * positive-progress states, matching the app's color-role convention. */
export default function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
        TONE_CLASSES[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
