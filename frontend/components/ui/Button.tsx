import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "mentor-primary" | "secondary" | "danger";
export type ButtonSize = "md" | "sm";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-mentee text-paper-raised font-bold hover:opacity-90",
  // Same shape as primary, but coral - for the one-off spots (the mentor
  // onboarding form's submit) that are specifically in mentor context and
  // use the mentor role color rather than the default mentee purple.
  "mentor-primary": "bg-mentor text-paper-raised font-bold hover:opacity-90",
  secondary:
    "border border-line text-ink font-medium hover:border-mentee hover:text-mentee",
  danger: "bg-danger text-paper-raised font-bold hover:opacity-90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-5 py-2.5 text-sm",
  sm: "px-3.5 py-2 text-xs",
};

/**
 * Returns the button className string without rendering anything - lets a
 * `<Link>` (Next.js navigation) share the exact same visual treatment as a
 * real `<button>`, since this app uses both for what are visually "buttons."
 */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return [
    "focus-ring inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] transition-opacity transition-colors disabled:opacity-50 disabled:pointer-events-none",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}
