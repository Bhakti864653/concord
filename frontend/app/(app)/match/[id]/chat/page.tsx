import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMatch } from "@/lib/matchAuth";
import { matchReasons } from "@/lib/matchReasons";
import { buildIcebreaker } from "@/lib/icebreaker";
import { loadMatchProgress } from "@/lib/matchProgress";
import MatchIdentity from "@/components/mentorship/MatchIdentity";
import MatchTabs from "../MatchTabs";
import Chat from "./Chat";

export default async function ChatPage({
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

  const [{ data: ownProfile }, { data: counterpart }, progress] = await Promise.all([
    supabase.from(ownTable).select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from(counterpartTable).select("*").eq("user_id", counterpartId).maybeSingle(),
    loadMatchProgress(supabase, id, user.id, counterpartId),
  ]);

  const counterpartTopic = ownProfile && counterpart
    ? isMentee
      ? counterpart.mentors_in
      : counterpart.seeking_guidance_on
    : null;

  const icebreaker =
    ownProfile && counterpart
      ? buildIcebreaker(
          matchReasons(
            isMentee ? ownProfile.seeking_guidance_on : counterpart.seeking_guidance_on,
            isMentee ? ownProfile.other_tag_text : counterpart.other_tag_text,
            (isMentee ? ownProfile.circumstance_tags : counterpart.circumstance_tags) ?? [],
            isMentee ? counterpart.mentors_in : ownProfile.mentors_in,
            isMentee ? counterpart.other_tag_text : ownProfile.other_tag_text,
            (isMentee ? counterpart.background_tags : ownProfile.background_tags) ?? [],
          ),
        )
      : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <MatchTabs id={id} active="chat" />

      {/* Compact, not a second hero - identity + the one piece of context
          (next session) that actually helps while chatting. The icebreaker
          only shows before a first message exists, so it never lingers as
          clutter once a real conversation is underway. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-paper-raised p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {counterpartTopic && (
            <MatchIdentity
              role={isMentee ? "mentor" : "mentee"}
              roleLabel={isMentee ? "Your mentor" : "Your mentee"}
              topic={counterpartTopic}
              size="sm"
            />
          )}
          {progress.nextSession && (
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 10h18M7 3v4M17 3v4M5 6h14a2 2 0 012 2v11a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2z" />
              </svg>
              Next session{" "}
              {new Date(progress.nextSession.scheduled_for).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
        {!progress.hasMessage && icebreaker && (
          <p className="rounded-xl bg-mentee-tint px-3 py-2 text-xs text-mentee">
            Icebreaker: {icebreaker}
          </p>
        )}
      </div>

      <Chat matchId={id} currentUserId={user.id} />
    </div>
  );
}
