/**
 * The one-line "how far along" summary shown on the dashboard and Our Plan -
 * factored out so the two screens can't drift into slightly different
 * wording. Renders nothing until there's at least one real goal, so it
 * never shows a hollow "0 of 0" state.
 */
export default function MentorshipProgress({
  goalsTotal,
  milestonesTotal,
  milestonesDone,
}: {
  goalsTotal: number;
  milestonesTotal: number;
  milestonesDone: number;
}) {
  if (goalsTotal === 0) return null;

  return (
    <p className="flex items-center gap-2 text-sm text-ink">
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-accord-tint text-accord">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v6M12 22a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z" />
        </svg>
      </span>
      {milestonesTotal > 0
        ? `${milestonesDone} of ${milestonesTotal} milestones done`
        : `${goalsTotal} shared goal${goalsTotal === 1 ? "" : "s"} set`}
    </p>
  );
}
