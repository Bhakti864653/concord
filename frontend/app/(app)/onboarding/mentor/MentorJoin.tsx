"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authFetch } from "@/lib/authFetch";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";
import { takePendingInvite } from "@/lib/invitations";
import AvailabilityPicker from "@/app/(app)/match/[id]/availability/AvailabilityPicker";
import Card from "@/components/ui/Card";
import Button, { buttonClasses } from "@/components/ui/Button";

export type MentorProfile = {
  user_id: string;
  mentors_in: string;
  background: string;
  background_tags: string[];
  other_tag_text: string | null;
  availability_count: number;
  bio: string;
};

type Participation = {
  has_profile: boolean;
  missing_steps: string[];
  joined: boolean;
  available_now: boolean;
  suspended: boolean;
  round_status: string | null;
};

const STEP_NAMES: Record<string, string> = {
  profile: "your profile",
  topics: "mentorship topics",
  capacity: "mentee capacity",
  availability: "availability",
};

const field =
  "rounded-[var(--radius-control)] border border-line bg-paper px-3 py-2 focus-ring focus:border-mentor";

async function readError(res: Response) {
  const body = await res.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : `Something went wrong (${res.status}).`;
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-3 font-display text-xl font-semibold tracking-tight text-ink">
        <span className="text-sm font-bold text-mentor">{n}</span>
        {title}
      </h2>
      {children}
    </Card>
  );
}

export default function MentorJoin({
  userId,
  profile,
  initialSlots,
}: {
  userId: string;
  profile: MentorProfile | null;
  initialSlots: string[];
}) {
  const [invite, setInvite] = useState<{ ok: boolean; message: string } | null>(null);
  const [status, setStatus] = useState<Participation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [topics, setTopics] = useState(profile?.mentors_in ?? "");
  const [tags, setTags] = useState<string[]>(profile?.background_tags ?? []);
  const [capacity, setCapacity] = useState(String(profile?.availability_count ?? 1));
  const [profileSaved, setProfileSaved] = useState(false);

  const [wantsToMentor, setWantsToMentor] = useState(false);
  const [reviewedPrivacy, setReviewedPrivacy] = useState(false);
  const [consentShown, setConsentShown] = useState(false);
  const [joinRound, setJoinRound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await authFetch("/mentors/participation");
      if (!res.ok) throw new Error(await readError(res));
      setStatus(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }, []);

  useEffect(() => {
    async function start() {
      // An invitation opened before signing in/up is claimed here, once. Claiming only records
      // that the invitation was accepted: it creates no match and skips none of the steps below.
      const token = takePendingInvite();
      if (token) {
        const res = await authFetch("/invitations/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        setInvite(
          res.ok
            ? {
                ok: true,
                message:
                  "Invitation accepted. It doesn't match you with anyone - finish the steps below to join matching.",
              }
            : { ok: false, message: await readError(res) },
        );
      }
      await refresh();
    }
    start();
  }, [refresh]);

  if (!profile) {
    return (
      <Card className="flex flex-col gap-3">
        <p className="text-ink">First, set up your mentor profile.</p>
        <Link href="/onboarding" className={buttonClasses("mentor-primary", "md", "self-start")}>
          Create your profile
        </Link>
      </Card>
    );
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);
    setProfileSaved(false);
    const res = await authFetch("/profiles/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mentors_in: topics,
        background: profile.background,
        background_tags: tags,
        other_tag_text: profile.other_tag_text,
        availability_count: parseInt(capacity, 10) || 1,
        bio: profile.bio,
      }),
    });
    if (!res.ok) return setError(await readError(res));
    setProfileSaved(true);
    refresh();
  }

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await authFetch("/mentors/participation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirms_wants_to_mentor: wantsToMentor,
          reviewed_privacy: reviewedPrivacy,
          consents_to_be_shown: consentShown,
          joins_matching: joinRound,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      const body = await res.json();
      setResult(body.round);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    const res = await authFetch("/mentors/participation/leave", { method: "POST" });
    setBusy(false);
    if (!res.ok) return setError(await readError(res));
    setResult(null);
    refresh();
  }

  const roundOpen = status?.round_status === "preferences_open";

  return (
    <div className="flex flex-col gap-4">
      {invite && (
        <p
          role="status"
          className={`rounded-[var(--radius-card)] border p-4 text-sm ${invite.ok ? "border-accord/30 bg-accord-tint text-ink" : "border-line bg-paper text-ink"}`}
        >
          {invite.message}
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!status && !error && <p className="text-sm text-muted">Loading...</p>}

      {status?.joined && (
        <Card className="flex flex-col gap-3">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {status.available_now ? "You're available on Concord." : "You're in for the next round."}
          </h2>
          <p className="text-sm text-muted">
            {status.available_now
              ? "Mentees in the current round can now see and rank you. Being ranked doesn't guarantee a match - the matching algorithm decides fairly."
              : result === "next" || !roundOpen
                ? "This round's preferences were already locked, so you'll appear when the next round opens. You haven't been added to the locked round."
                : "You'll appear to mentees shortly."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href="/preferences" className={buttonClasses("mentor-primary")}>
              Rank mentees
            </Link>
            <Button type="button" variant="secondary" disabled={busy} onClick={leave}>
              Stop participating
            </Button>
          </div>
        </Card>
      )}

      {status && !status.joined && !status.suspended && (
        <>
          <Step n={1} title="Confirm you want to mentor">
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" checked={wantsToMentor} onChange={(e) => setWantsToMentor(e.target.checked)} className="mt-1" />
              Yes, I&apos;d like to mentor someone through Concord.
            </label>
          </Step>

          <Step n={2} title="Review your profile, topics, and capacity">
            <form onSubmit={saveProfile} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm text-ink">
                What can you mentor in?
                <input required maxLength={200} value={topics} onChange={(e) => setTopics(e.target.value)} className={field} />
              </label>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm text-ink">Part of your own path (optional)</legend>
                <div className="flex flex-wrap gap-2">
                  {CIRCUMSTANCE_TAGS.map((tag) => (
                    <label
                      key={tag.value}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--focus-ring)] ${tags.includes(tag.value) ? "border-mentor bg-mentor-tint font-medium text-ink" : "border-line text-muted"}`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={tags.includes(tag.value)}
                        onChange={() =>
                          setTags((prev) =>
                            prev.includes(tag.value) ? prev.filter((t) => t !== tag.value) : [...prev, tag.value],
                          )
                        }
                      />
                      {tag.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="flex flex-col gap-1.5 text-sm text-ink">
                How many mentees are you open to?
                <input type="number" min={1} max={50} required value={capacity} onChange={(e) => setCapacity(e.target.value)} className={`${field} w-24`} />
              </label>
              <p className="text-xs text-muted">Your background and bio stay as you wrote them.</p>
              <div className="flex items-center gap-3">
                <Button type="submit" variant="secondary">Save these</Button>
                {profileSaved && <span className="text-xs font-medium text-accord">Saved.</span>}
              </div>
            </form>
          </Step>

          <Step n={3} title="Set your availability">
            <p className="text-sm text-muted">When are you usually free? Save at least one time.</p>
            <AvailabilityPicker userId={userId} initialSlots={initialSlots} partnerSlots={[]} />
          </Step>

          <Step n={4} title="Privacy and participation">
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
              <li>Mentees see your topics, background, bio, and capacity - never your email.</li>
              <li>Your chat, notes, and goals are visible only to you and your match.</li>
              <li>Joining doesn&apos;t guarantee a match, and nobody is matched with you because they invited you.</li>
              <li>You can stop participating at any time. It won&apos;t end an existing match.</li>
            </ul>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" checked={reviewedPrivacy} onChange={(e) => setReviewedPrivacy(e.target.checked)} className="mt-1" />
              I&apos;ve read how my information is used.
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" checked={consentShown} onChange={(e) => setConsentShown(e.target.checked)} className="mt-1" />
              Show my mentor profile to mentees.
            </label>
          </Step>

          <Step n={5} title="Join a matching round">
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" checked={joinRound} onChange={(e) => setJoinRound(e.target.checked)} className="mt-1" />
              {roundOpen
                ? "Add me to the current matching round."
                : "Add me to the next matching round. (This round's preferences are already locked.)"}
            </label>
            {status.missing_steps.length > 0 && (
              <p className="text-sm text-muted">
                Still to do: {status.missing_steps.map((s) => STEP_NAMES[s] ?? s).join(", ")}.
              </p>
            )}
            <Button
              type="button"
              variant="mentor-primary"
              className="self-start"
              disabled={busy || !wantsToMentor || !reviewedPrivacy || !consentShown || !joinRound}
              onClick={join}
            >
              {busy ? "Joining..." : "Join matching"}
            </Button>
          </Step>
        </>
      )}

      {status?.suspended && (
        <Card>
          <p className="text-sm text-ink">
            This account can&apos;t join matching right now. Please contact the Concord team.
          </p>
        </Card>
      )}
    </div>
  );
}
