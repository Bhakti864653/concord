import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import { matchReasons } from "@/lib/matchReasons";
import { requireMatch } from "@/lib/matchAuth";
import { CIRCUMSTANCE_TAGS } from "@/lib/tags";
import MatchTabs from "./MatchTabs";

const TAG_LABELS = new Map(CIRCUMSTANCE_TAGS.map((t) => [t.value, t.label]));

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, match } = await requireMatch(supabase, id);

  const userType = user.user_metadata?.user_type as "mentee" | "mentor" | undefined;
  if (userType !== "mentee" && userType !== "mentor") {
    redirect("/login");
  }

  const isMentee = userType === "mentee";
  const ownTable = isMentee ? "mentee_profiles" : "mentor_profiles";
  const counterpartTable = isMentee ? "mentor_profiles" : "mentee_profiles";
  const counterpartId = isMentee ? match.mentor_user_id : match.mentee_user_id;

  const [{ data: ownProfile }, { data: counterpart }] = await Promise.all([
    supabase.from(ownTable).select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from(counterpartTable).select("*").eq("user_id", counterpartId).maybeSingle(),
  ]);

  if (!ownProfile || !counterpart) {
    redirect("/dashboard");
  }

  const reasons = matchReasons(
    isMentee ? ownProfile.seeking_guidance_on : counterpart.seeking_guidance_on,
    isMentee ? ownProfile.other_tag_text : counterpart.other_tag_text,
    (isMentee ? ownProfile.circumstance_tags : counterpart.circumstance_tags) ?? [],
    isMentee ? counterpart.mentors_in : ownProfile.mentors_in,
    isMentee ? counterpart.other_tag_text : ownProfile.other_tag_text,
    (isMentee ? counterpart.background_tags : ownProfile.background_tags) ?? [],
  );

  const icebreaker =
    reasons.sharedWords.length > 0
      ? `You both mentioned "${reasons.sharedWords[0]}" - ask them about it.`
      : reasons.sharedTags.length > 0
        ? `You both share ${TAG_LABELS.get(reasons.sharedTags[0]) ?? reasons.sharedTags[0]} - that's a good place to start.`
        : "Ask them what got them started on this path.";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>

      <MatchTabs id={id} active="overview" />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-accord">You&apos;ve been matched!</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {isMentee ? counterpart.mentors_in : counterpart.seeking_guidance_on}
        </h1>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-accord bg-accord-tint p-5">
        <p className="text-sm text-ink">{counterpart.bio}</p>

        {!isMentee && (
          <p className="text-xs text-ink/70">
            Their background: {counterpart.background}
          </p>
        )}

        {(reasons.sharedWords.length > 0 || reasons.sharedTags.length > 0) && (
          <p className="text-xs text-ink/70">
            You both mentioned{" "}
            {reasons.sharedWords.slice(0, 4).join(", ") || "similar things"}
            {reasons.sharedTags.length > 0 &&
              ` and share ${reasons.sharedTags.map((t) => TAG_LABELS.get(t) ?? t).join(", ")}`}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-lg border-l-4 border-mentee bg-paper-raised p-4">
        <h2 className="text-sm font-medium text-muted">Icebreaker</h2>
        <p className="text-sm text-ink">{icebreaker}</p>
      </section>

      <Link
        href={`/match/${id}/chat`}
        className="self-start rounded-md bg-ink px-5 py-2.5 font-medium text-paper transition-opacity hover:opacity-90"
      >
        Start chatting
      </Link>
    </main>
  );
}
