"use client";

import { useId, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Hide the label visually while keeping it for screen readers - use
   * sparingly, a visible label is preferred. */
  hideLabel?: boolean;
  error?: string;
}

/**
 * A real labeled input with a visible keyboard-focus ring. Replaces the
 * previous placeholder-only, `focus:outline-none`-with-nothing-restored
 * pattern used on the login/signup forms - that combination left keyboard
 * users with no visible focus indicator at all.
 */
export default function Input({
  label,
  hideLabel = false,
  error,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className={hideLabel ? "sr-only" : "text-sm font-medium text-ink"}
      >
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        className={[
          "focus-ring rounded-[var(--radius-control)] border border-line bg-paper px-3 py-2 text-ink",
          error ? "border-danger" : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
