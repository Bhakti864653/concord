import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import AvailabilityPicker from "../availability/AvailabilityPicker";
import GoalsList from "../goals/GoalsList";
import SessionsList from "../sessions/SessionsList";
import NotesList from "../notes/NotesList";

export default async function JourneyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, match } = await requireMatch(supabase, id);

  const isMentee = user.id === match.mentee_user_id;
  const partnerId = isMentee ? match.mentor_user_id : match.mentee_user_id;
  const partnerLabel = isMentee ? "Your mentor" : "Your mentee";

  const [
    { data: ownAvailability },
    { data: partnerAvailability },
    { data: goals },
    { data: sessions },
    { data: checkins },
    { data: notes },
  ] = await Promise.all([
    supabase.from("availability").select("slots").eq("user_id", user.id).maybeSingle(),
    supabase.from("availability").select("slots").eq("user_id", partnerId).maybeSingle(),
    supabase
      .from("match_goals")
      .select("id, title, deadline, notes, created_by, created_at")
      .eq("match_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("match_sessions")
      .select("id, scheduled_for, created_by, created_at")
      .eq("match_id", id)
      .order("scheduled_for", { ascending: false }),
    supabase
      .from("session_checkins")
      .select("id, session_id, did_happen, helpfulness, continue_wanted, focus_next")
      .eq("user_id", user.id),
    supabase
      .from("match_notes")
      .select("id, author_id, body, created_at")
      .eq("match_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: milestones } =
    goalIds.length > 0
      ? await supabase
          .from("match_milestones")
          .select("id, goal_id, title, done, created_at")
          .in("goal_id", goalIds)
          .order("created_at", { ascending: true })
      : { data: [] };

  const nextSession = (sessions ?? [])
    .filter((s) => new Date(s.scheduled_for) >= new Date())
    .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0];

  const milestonesTotal = (milestones ?? []).length;
  const milestonesDone = (milestones ?? []).filter((m) => m.done).length;

  return (
    <div className="flex flex-col gap-4">
      <MatchTabs id={id} active="ourplan" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Your shared plan.
        </h1>
        <p className="text-sm text-muted">
          Availability, goals, sessions, and notes - everything you&apos;re building together, in one place.
        </p>
      </div>

      {(nextSession || milestonesTotal > 0) && (
        <div className="concord-lift flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-4 sm:flex-row sm:items-center sm:gap-6">
          {nextSession && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-mentee-tint text-mentee">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 10h18M7 3v4M17 3v4M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
              </span>
              Next session:{" "}
              <span className="font-medium">
                {new Date(nextSession.scheduled_for).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </p>
          )}
          {milestonesTotal > 0 && (
            <p className="flex items-center gap-2 text-sm text-ink">
              <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-accord-tint text-accord">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12l4 4L19 6" />
                </svg>
              </span>
              {milestonesDone} of {milestonesTotal} milestones done
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-muted">AVAILABILITY</h2>
          <AvailabilityPicker
            userId={user.id}
            initialSlots={ownAvailability?.slots ?? []}
            partnerSlots={partnerAvailability?.slots ?? []}
          />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-muted">SHARED GOALS</h2>
          <GoalsList
            matchId={id}
            currentUserId={user.id}
            initialGoals={goals ?? []}
            initialMilestones={milestones ?? []}
          />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-muted">SESSIONS</h2>
          <SessionsList
            matchId={id}
            currentUserId={user.id}
            initialSessions={sessions ?? []}
            initialCheckins={checkins ?? []}
          />
          <Link href={`/match/${id}/checkin`} className="focus-ring text-sm font-medium text-mentee underline">
            Go to your pending check-ins →
          </Link>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-bold text-muted">NOTES</h2>
          <NotesList
            matchId={id}
            currentUserId={user.id}
            partnerLabel={partnerLabel}
            initialNotes={notes ?? []}
          />
        </section>
      </div>
    </div>
  );
}
