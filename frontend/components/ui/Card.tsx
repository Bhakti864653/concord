import type { HTMLAttributes } from "react";

export type CardPadding = "none" | "sm" | "md";

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "",
  sm: "p-4",
  md: "p-6",
};

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding;
  /** Cards default to the lifted-shadow treatment; set false for a flat,
   * bordered-only surface (e.g. a card nested inside another card). */
  lift?: boolean;
}

/** The app's one recurring "raised surface" treatment, centralized so every
 * card/panel agrees on radius, border, and background instead of each page
 * hand-rolling `concord-lift rounded-2xl border border-line bg-paper-raised`. */
export default function Card({
  padding = "md",
  lift = true,
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={[
        lift ? "concord-lift" : "",
        "rounded-[var(--radius-card)] border border-line bg-paper-raised",
        PADDING_CLASSES[padding],
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
