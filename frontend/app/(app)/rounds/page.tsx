import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STEPS = [
  { key: "preferences_open", label: "Preferences open" },
  { key: "preferences_locked", label: "Review & lock" },
  { key: "matching_in_progress", label: "Matching runs" },
  { key: "results_available", label: "Results revealed" },
] as const;

export default async function RoundsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const userType = user.user_metadata?.user_type as "mentee" | "mentor" | undefined;
  if (userType !== "mentee" && userType !== "mentor") redirect("/login");

  const preferencesTable = userType === "mentee" ? "mentee_preferences" : "mentor_preferences";
  const { data: preferences } = await supabase
    .from(preferencesTable)
    .select("locked")
    .eq("user_id", user.id)
    .maybeSingle();
  const preferencesLocked = preferences?.locked ?? false;

  const matchColumn = userType === "mentee" ? "mentee_user_id" : "mentor_user_id";
  const { data: matchRows } = await supabase
    .from("matches")
    .select("mentee_user_id")
    .eq(matchColumn, user.id)
    .eq("status", "active")
    .limit(1);
  const isMatched = (matchRows ?? []).length > 0;
  const isWaitlisted = preferencesLocked && !isMatched;

  const { data: currentRound } = await supabase
    .from("matching_rounds")
    .select("status")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const roundStatus = currentRound?.status ?? "preferences_open";
  const currentIndex = STEPS.findIndex((s) => s.key === roundStatus);

  const yourPlace = isMatched
    ? "You're matched for this round - keep the conversation moving on your match page."
    : preferencesLocked
      ? "Your preferences are locked and ready for matching. You'll be notified the moment results are in."
      : "Your preferences aren't locked yet - rank and lock them so you're included when matching runs.";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-extrabold uppercase tracking-widest text-mentee">
            Matching rounds & waitlist
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Know exactly where you stand.
          </h1>
          <p className="max-w-lg text-sm text-muted">
            Matching happens in clear rounds so mutual preferences and mentor capacity can be
            considered fairly.
          </p>
        </div>
        <span className="rounded-full border border-line bg-paper-raised px-3 py-1 text-xs font-bold text-muted">
          {roundStatus.replaceAll("_", " ")}
        </span>
      </div>

      <div className="concord-lift rounded-2xl border border-line bg-paper-raised p-5">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`rounded-2xl p-4 ${
                i === currentIndex
                  ? "bg-mentee text-paper-raised"
                  : i < currentIndex
                    ? "bg-accord-tint text-accord"
                    : "border border-line bg-paper text-muted"
              }`}
            >
              <span className="block text-[11px] font-bold opacity-80">
                {i === currentIndex ? "YOU ARE HERE" : i < currentIndex ? "DONE" : `STEP ${i + 1}`}
              </span>
              <strong className="mt-1 block text-sm">{step.label}</strong>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-mentee-tint p-4">
          <strong className="block text-sm text-mentee">Your place in this round</strong>
          <p className="mt-1 text-sm text-ink">{yourPlace}</p>
        </div>

        {!isMatched && (
          <Link
            href="/preferences"
            className="mt-4 inline-block rounded-xl bg-ink px-5 py-2.5 text-sm font-bold text-paper transition-opacity hover:opacity-90"
          >
            Review preferences
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="concord-lift rounded-2xl border border-line bg-paper-raised p-5">
          <p className="text-xs font-bold text-muted">IF YOU AREN&apos;T MATCHED</p>
          <h2 className="mt-1 font-medium text-ink">The waitlist keeps your place</h2>
          <p className="mt-1 text-sm text-muted">
            You&apos;ll automatically carry into the next round. We&apos;ll notify you when new
            matches happen, and you can update your preferences any time preferences are open.
          </p>
          {isWaitlisted && (
            <p className="mt-3 text-xs font-semibold text-accord">
              You&apos;re on the waitlist right now.
            </p>
          )}
        </div>
        <div className="concord-lift rounded-2xl border border-line bg-paper-raised p-5">
          <p className="text-xs font-bold text-muted">MENTOR CAPACITY</p>
          <h2 className="mt-1 font-medium text-ink">Why capacity matters</h2>
          <p className="mt-1 text-sm text-muted">
            A mentor can only receive the number of mentees they set as their capacity. Capacity
            is considered inside the stable matching process itself - not after it.
          </p>
        </div>
      </div>
    </div>
  );
}
