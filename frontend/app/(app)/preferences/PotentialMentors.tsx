"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import {
  ACTIVE_STATUSES,
  STATUS_LABELS,
  type Invitation,
} from "@/lib/invitations";
import NavIcon from "@/components/NavIcon";
import { buttonClasses } from "@/components/ui/Button";

type Suggestion = {
  id: string;
  display_name: string;
  field: string;
  summary: string;
  is_demonstration: boolean;
  label: string | null;
};

const NOT_CONFIRMED = ["Not yet on Concord", "Availability not confirmed", "Invitation required"];

/** A restrained card for someone who has NOT joined: dotted border, an envelope rather than a
 * match icon, no photo, no score, and no way to add them to a ranking. */
function PotentialCard({
  name,
  field,
  children,
  action,
}: {
  name: string;
  field?: string | null;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-dashed border-line bg-paper p-4">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-line text-muted">
          <NavIcon name="invite" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-ink">{name}</p>
          {field && <p className="text-sm text-muted">{field}</p>}
        </div>
      </div>
      <ul className="flex flex-wrap gap-1.5" aria-label="Status">
        {NOT_CONFIRMED.map((label) => (
          <li
            key={label}
            className="rounded-full border border-line px-2.5 py-0.5 text-xs text-muted"
          >
            {label}
          </li>
        ))}
      </ul>
      {children}
      {action}
    </li>
  );
}

export default function PotentialMentors() {
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [inv, sug] = await Promise.all([
          authFetch("/invitations"),
          authFetch("/mentors/potential"),
        ]);
        if (!inv.ok || !sug.ok) throw new Error("Couldn't load potential mentors.");
        setInvitations((await inv.json()).invitations);
        setSuggestions((await sug.json()).suggestions);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    }
    load();
  }, []);

  const active = (invitations ?? []).filter((i) => ACTIVE_STATUSES.includes(i.status));

  return (
    <section aria-labelledby="potential-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h2
            id="potential-heading"
            className="font-display text-2xl font-semibold tracking-tight text-ink"
          >
            Potential mentors to invite
          </h2>
          <p className="text-sm text-muted">
            These people have not joined Concord or confirmed their availability. You can invite
            them, but they cannot be ranked or matched until they create an account and choose to
            participate.
          </p>
        </div>
        <Link href="/invitations?new=1" className={buttonClasses("secondary", "md", "shrink-0")}>
          <NavIcon name="invite" />
          Invite a mentor
        </Link>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
      {!error && (invitations === null || suggestions === null) && (
        <p className="text-sm text-muted">Loading...</p>
      )}

      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-ink">People you invited</h3>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {active.map((i) => (
              <PotentialCard
                key={i.id}
                name={i.safe_display_name}
                field={i.organization_or_field}
                action={
                  <p className="text-xs text-muted">
                    Invitation: {STATUS_LABELS[i.status]} ·{" "}
                    <Link href="/invitations" className="focus-ring rounded underline">
                      Manage
                    </Link>
                  </p>
                }
              />
            ))}
          </ul>
        </div>
      )}

      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-ink">Examples</h3>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((s) => (
              <PotentialCard
                key={s.id}
                name={s.display_name}
                field={s.field}
                action={
                  <Link
                    href={`/invitations?new=1&field=${encodeURIComponent(s.field)}`}
                    className={buttonClasses("secondary", "sm", "self-start")}
                  >
                    Invite to Concord
                  </Link>
                }
              >
                {s.is_demonstration && s.label && (
                  <p className="rounded-[var(--radius-control)] bg-line/40 px-2.5 py-1.5 text-xs font-medium text-ink">
                    {s.label}
                  </p>
                )}
                <p className="text-sm text-muted">{s.summary}</p>
              </PotentialCard>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
