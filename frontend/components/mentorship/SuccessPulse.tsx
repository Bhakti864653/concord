"use client";

import { useState } from "react";

/**
 * A brief inline confirmation after an important action - not a persistent
 * toast. Bump `trigger` (e.g. a counter) each time the action succeeds;
 * the message shows itself and unmounts on its own animation's end event
 * (see .success-pulse in globals.css) rather than a timer effect, so there
 * are no refs or setState-in-effect calls for the strict hooks lint rules
 * here to flag.
 */
export default function SuccessPulse({ message, trigger }: { message: string; trigger: number }) {
  const [dismissedTrigger, setDismissedTrigger] = useState(0);
  const visible = trigger !== 0 && trigger !== dismissedTrigger;

  if (!visible) return null;

  return (
    <p
      role="status"
      className="success-pulse flex items-center gap-1.5 text-sm font-medium text-accord"
      onAnimationEnd={() => setDismissedTrigger(trigger)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <path d="M5 12l4 4L19 6" />
      </svg>
      {message}
    </p>
  );
}
