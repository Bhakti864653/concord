"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import {
  ACTIVE_STATUSES,
  STATUS_LABELS,
  inviteUrl,
  type Invitation,
} from "@/lib/invitations";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button, { buttonClasses } from "@/components/ui/Button";
import NavIcon from "@/components/NavIcon";

type Step = "details" | "review" | "ready";

const field =
  "rounded-[var(--radius-control)] border border-line bg-paper px-3 py-2 focus-ring focus:border-mentee";

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : `Something went wrong (${res.status}).`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Copy, plus native share where the browser supports it, with honest feedback. */
function LinkActions({ url }: { url: string }) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "An invitation to mentor on Concord", url });
    } catch {
      // Cancelled or unsupported: the copy button still works.
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        readOnly
        value={url}
        aria-label="Invitation link"
        className={`${field} text-sm`}
        onFocus={(e) => e.currentTarget.select()}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={copy}>
          {copied === "copied" ? "Copied" : "Copy invitation link"}
        </Button>
        {canShare && (
          <Button type="button" variant="secondary" onClick={share}>
            Share invitation
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-xs text-muted">
        {copied === "failed" && "Couldn't copy automatically - select the link above and copy it."}
      </p>
    </div>
  );
}

function InviteFlow({
  prefillField,
  onDone,
  onCancel,
}: {
  prefillField: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState(prefillField);
  const [message, setMessage] = useState("");
  const [showMyName, setShowMyName] = useState(false);
  const [myName, setMyName] = useState("");
  const [legit, setLegit] = useState(false);
  const [understands, setUnderstands] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [link, setLink] = useState<{ url: string; expires_at: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function toReview(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch("/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          safe_display_name: name,
          email: email || null,
          organization_or_field: org || null,
          invitation_message: message || null,
          inviter_display_name: showMyName ? myName || null : null,
          legitimate_reason_confirmed: legit,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      setDraftId((await res.json()).id);
      setStep("review");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!draftId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/invitations/${draftId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ understands_not_a_match: understands }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const body = await res.json();
      setLink({ url: inviteUrl(body.link_path), expires_at: body.expires_at });
      setStep("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "ready" && link) {
    return (
      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Your invitation is ready.
        </h2>
        <p className="text-sm text-muted">
          Concord doesn&apos;t send email, so nothing has been sent yet. Share this link with {name}{" "}
          yourself. It works once and expires on {formatDate(link.expires_at)}. This is the only
          time this link is shown. If you lose it, you can make a new one from your invitations.
        </p>
        <LinkActions url={link.url} />
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Link href="/preferences" className={buttonClasses("secondary")}>
            Return to mentor discovery
          </Link>
          <Button type="button" variant="secondary" onClick={onDone}>
            See your invitations
          </Button>
        </div>
      </Card>
    );
  }

  if (step === "review") {
    return (
      <Card className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Before you create this invitation
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
          <li>{name} is not currently a Concord mentor.</li>
          <li>Concord has not verified their availability.</li>
          <li>Creating an invitation does not create a match.</li>
          <li>They must register and consent before participating.</li>
          <li>The invitation does not guarantee they will accept.</li>
        </ul>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={understands}
            onChange={(e) => setUnderstands(e.target.checked)}
            className="mt-1"
          />
          I understand. Create the invitation link.
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={create} disabled={!understands || busy}>
            {busy ? "Creating..." : "Create invitation"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={toReview} className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Who would you like to invite?
        </h2>
        <p className="text-sm text-muted">
          Only what&apos;s needed. Please don&apos;t add addresses, phone numbers, or personal
          details about them.
        </p>
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Their name, or how you&apos;d like to refer to them
          <input
            required
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Their field or organization (optional)
          <input
            maxLength={120}
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Why you think they could be a helpful mentor (optional, shown on their invitation)
          <textarea
            rows={3}
            maxLength={500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-ink">
          Their email (optional)
          <input
            type="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <span className="text-xs text-muted">
            Concord doesn&apos;t send email and never stores the address, only a scrambled
            fingerprint of it.
          </span>
        </label>
        <fieldset className="flex flex-col gap-2 text-sm text-ink">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={showMyName}
              onChange={(e) => setShowMyName(e.target.checked)}
              className="mt-1"
            />
            Show my first name on the invitation
          </label>
          {showMyName && (
            <input
              aria-label="Your first name"
              placeholder="Your first name"
              maxLength={40}
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              className={`${field} max-w-xs`}
            />
          )}
        </fieldset>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            required
            type="checkbox"
            checked={legit}
            onChange={(e) => setLegit(e.target.checked)}
            className="mt-1"
          />
          I know this person, or have a genuine reason to believe they could help, and I&apos;m
          inviting them in good faith.
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy || !legit || !name.trim()}>
            {busy ? "Saving..." : "Review invitation"}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

function InvitationRow({ inv, onChange }: { inv: Invitation; onChange: () => void }) {
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = ACTIVE_STATUSES.includes(inv.status);

  async function act(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch(`/invitations/${inv.id}/${path}`, { method: "POST" });
      if (!res.ok) throw new Error(await readError(res));
      return await res.json();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 border-b border-line py-4 last:border-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{inv.safe_display_name}</p>
          <p className="text-xs text-muted">
            Created {formatDate(inv.created_at)}
            {inv.expires_at && active && <> · Expires {formatDate(inv.expires_at)}</>}
          </p>
        </div>
        <Badge tone={inv.status === "accepted" ? "accord" : "neutral"}>
          {STATUS_LABELS[inv.status]}
        </Badge>
      </div>
      {active && !freshUrl && (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              const body = await act("new-link");
              if (body) setFreshUrl(inviteUrl(body.link_path));
            }}
          >
            Copy a new link
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              if ((await act("revoke")) !== null) onChange();
            }}
          >
            Revoke
          </Button>
        </div>
      )}
      {freshUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted">A new link is ready. The previous link no longer works.</p>
          <LinkActions url={freshUrl} />
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </li>
  );
}

export default function InvitationsView({
  startOpen,
  prefillField,
}: {
  startOpen: boolean;
  prefillField: string;
}) {
  const [creating, setCreating] = useState(startOpen);
  const [invitations, setInvitations] = useState<Invitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bumping this reloads the list (after creating or revoking an invitation).
  const [version, setVersion] = useState(0);
  const load = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function fetchList() {
      try {
        const res = await authFetch("/invitations");
        if (!res.ok) throw new Error(await readError(res));
        const body: { invitations: Invitation[] } = await res.json();
        if (!cancelled) setInvitations(body.invitations.filter((i) => i.status !== "draft"));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    }
    fetchList();
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <div className="flex flex-col gap-6">
      {creating ? (
        <InviteFlow
          prefillField={prefillField}
          onDone={() => {
            setCreating(false);
            load();
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <Button type="button" className="self-start" onClick={() => setCreating(true)}>
          <NavIcon name="invite" />
          Invite a mentor
        </Button>
      )}

      <Card>
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          Your invitations
        </h2>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        {!error && invitations === null && <p className="mt-3 text-sm text-muted">Loading...</p>}
        {invitations && invitations.length === 0 && (
          <p className="mt-3 text-sm text-muted">You haven&apos;t invited anyone yet.</p>
        )}
        {invitations && invitations.length > 0 && (
          <ul className="mt-2">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} inv={inv} onChange={load} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
