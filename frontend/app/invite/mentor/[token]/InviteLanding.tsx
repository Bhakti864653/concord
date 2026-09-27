"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import Card from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";
import PageTransition from "@/components/PageTransition";
import { rememberPendingInvite } from "@/lib/invitations";

type Invite = {
  inviter_display_name: string | null;
  invitation_message: string | null;
  organization_or_field: string | null;
  expires_at: string | null;
};

type State =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "error" }
  | { kind: "ready"; invite: Invite }
  | { kind: "declined" };

const INVOLVES = [
  "Create a mentor account and a short profile: what you can help with and a little about your path.",
  "Choose how many mentees you're open to, and when you're usually available.",
  "Rank mentees in a matching round. Concord pairs people with a stable matching algorithm, so nobody is matched just because they invited you.",
  "Chat, set goals, and log sessions with your match inside Concord.",
];

const PRIVACY = [
  "Opening this page doesn't create an account. The person who invited you will see that the invitation was opened.",
  "Your profile is only shown to mentees after you finish setting it up and agree to be shown.",
  "Chat, notes, and goals are visible only to you and your match.",
  "Whoever invited you can see that the invitation was accepted or not, never why, and nothing else about your account.",
];

// Rendered in the browser (not on the server) so the per-visitor rate limit sees the visitor's
// own address, and so opening the link is one deliberate page view, not a prefetch.
export default function InviteLanding({ token }: { token: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [confirmDecline, setConfirmDecline] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL}/invitations/public/${encodeURIComponent(token)}`,
          { referrerPolicy: "no-referrer" },
        );
        if (cancelled) return;
        if (res.status === 404) return setState({ kind: "invalid" });
        if (!res.ok) return setState({ kind: "error" });
        setState({ kind: "ready", invite: await res.json() });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function decline() {
    setBusy(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/invitations/public/${encodeURIComponent(token)}/decline`,
        { method: "POST", referrerPolicy: "no-referrer" },
      );
      setState(res.ok ? { kind: "declined" } : { kind: "invalid" });
    } catch {
      setState({ kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageTransition>
      <main className="relative w-full overflow-hidden p-6">
        <div aria-hidden="true" className="concord-glow pointer-events-none fixed inset-0 -z-10" />
        <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
          <Link href="/" className="focus-ring flex items-center gap-2 self-start rounded-lg">
            <Logo />
            <span className="font-display font-medium text-ink">Concord</span>
          </Link>

          {state.kind === "loading" && <p className="text-sm text-muted">Opening your invitation...</p>}

          {state.kind === "invalid" && (
            <Card className="flex flex-col gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                This invitation link isn&apos;t valid anymore.
              </h1>
              <p className="text-sm text-muted">
                It may have expired, been used already, or been withdrawn. You&apos;re still welcome
                to learn about Concord.
              </p>
              <Link href="/how-it-works" className={buttonClasses("secondary", "md", "self-start")}>
                How Concord works
              </Link>
            </Card>
          )}

          {state.kind === "error" && (
            <Card className="flex flex-col gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                We couldn&apos;t open this invitation right now.
              </h1>
              <p className="text-sm text-muted">
                Please try again in a moment. (The server can take about 30 seconds to wake up.)
              </p>
              <Button type="button" className="self-start" onClick={() => window.location.reload()}>
                Try again
              </Button>
            </Card>
          )}

          {state.kind === "declined" && (
            <Card className="flex flex-col gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Invitation declined.
              </h1>
              <p className="text-sm text-muted">
                Thanks for letting us know. No account was created, and the link no longer works.
              </p>
            </Card>
          )}

          {state.kind === "ready" && (
            <>
              <div className="flex flex-col gap-2 border-l-4 border-mentor pl-4">
                <p className="text-sm font-medium text-mentor">A mentoring invitation</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
                  You have been invited to explore mentoring on Concord.
                </h1>
                <p className="text-sm text-muted">
                  {state.invite.inviter_display_name
                    ? `${state.invite.inviter_display_name} thought you could be a helpful mentor`
                    : "Someone on Concord thought you could be a helpful mentor"}
                  {state.invite.organization_or_field
                    ? ` in ${state.invite.organization_or_field}.`
                    : "."}
                </p>
              </div>

              {state.invite.invitation_message && (
                <Card padding="md" lift={false}>
                  <p className="text-xs font-medium text-muted">Their message</p>
                  <p className="mt-1 whitespace-pre-line text-ink">{state.invite.invitation_message}</p>
                </Card>
              )}

              <Card className="flex flex-col gap-3">
                <p className="text-ink">
                  <strong>An invitation is not a match.</strong> You decide whether to join, what
                  information to share, and whether to participate in a future matching round.
                </p>
                <p className="text-sm text-muted">
                  Concord connects people looking for guidance with mentors who have walked a
                  similar path. Joining is voluntary, and registering doesn&apos;t guarantee any
                  particular match, including with the person who invited you.
                </p>
              </Card>

              <section className="flex flex-col gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                  What mentoring involves
                </h2>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
                  {INVOLVES.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-2">
                <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
                  Your privacy
                </h2>
                <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
                  {PRIVACY.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </section>

              <Card className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/signup?role=mentor"
                    onClick={() => rememberPendingInvite(token)}
                    className={buttonClasses("mentor-primary")}
                  >
                    Create a mentor account
                  </Link>
                  <Link
                    href="/login?next=/onboarding/mentor"
                    onClick={() => rememberPendingInvite(token)}
                    className={buttonClasses("secondary")}
                  >
                    Sign in if you already have one
                  </Link>
                  <Link href="/how-it-works" className={buttonClasses("secondary")}>
                    Explore becoming a mentor
                  </Link>
                </div>
                <div className="border-t border-line pt-3">
                  {confirmDecline ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm text-ink">Decline this invitation? The link will stop working.</p>
                      <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={decline}>
                        Yes, decline
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmDecline(false)}>
                        Keep it
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDecline(true)}
                      className="focus-ring rounded text-sm text-muted underline"
                    >
                      No thanks, decline the invitation
                    </button>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    Declining doesn&apos;t need an account. Nothing happens if you simply close
                    this page.
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
