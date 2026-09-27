"use client";

import { useSyncExternalStore, useState } from "react";
import { hasPendingInvite, takePendingInvite } from "@/lib/invitations";

/**
 * Shown to a mentee who signed in from a mentor invitation link. Invitations can only be
 * accepted with a mentor account and account types never change, so instead of landing on the
 * dashboard with no explanation, they're told what happened and what they can do.
 */
export default function PendingInviteNotice() {
  const pending = useSyncExternalStore(
    () => () => {},
    hasPendingInvite,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);

  if (!pending || dismissed) return null;

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-paper-raised p-4 text-sm text-ink sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        You opened a mentor invitation, but this is a mentee account. Invitations are accepted
        with a mentor account, and account types can&apos;t be changed. To accept it, log out
        and create a separate mentor account, then open the invitation link again.
      </p>
      <button
        type="button"
        onClick={() => {
          takePendingInvite();
          setDismissed(true);
        }}
        className="focus-ring shrink-0 self-start rounded-[var(--radius-control)] border border-line px-3.5 py-2 text-xs font-medium hover:border-mentee sm:self-center"
      >
        Dismiss
      </button>
    </div>
  );
}
