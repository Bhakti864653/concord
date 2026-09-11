export type PathMilestone = { id: string; title: string; done: boolean };

/**
 * A goal's milestones as connected checkpoints (decorative, aria-hidden)
 * plus the real accessible checklist underneath - the decorative row is
 * extra visual meaning layered on top, not a replacement for the labeled
 * checkboxes screen readers and keyboard users rely on. Toggle/delete wiring
 * is unchanged from the plain checkbox list this replaces in GoalsList.tsx -
 * same match_milestones mutations, just a different presentation.
 */
export default function MilestonePath({
  milestones,
  onToggle,
  onDelete,
}: {
  milestones: PathMilestone[];
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (milestones.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div aria-hidden="true" className="flex items-center gap-1 overflow-x-auto pb-1">
        {milestones.map((m, i) => (
          <div key={m.id} className="flex shrink-0 items-center gap-1">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                m.done ? "bg-mentor text-paper" : "border-2 border-line bg-paper-raised text-muted"
              }`}
            >
              {m.done ? (
                <svg
                  className="milestone-pop"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path d="M5 12l4 4L19 6" />
                </svg>
              ) : (
                <span className="text-[10px] font-bold">{i + 1}</span>
              )}
            </span>
            {i < milestones.length - 1 && (
              <span className={`h-0.5 w-6 shrink-0 ${m.done ? "bg-mentor" : "bg-line"}`} />
            )}
          </div>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {milestones.map((m) => (
          <li key={m.id} className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              id={`milestone-${m.id}`}
              checked={m.done}
              onChange={(e) => onToggle(m.id, e.target.checked)}
              className="h-5 w-5 accent-mentor"
            />
            <label
              htmlFor={`milestone-${m.id}`}
              className={`flex-1 cursor-pointer text-sm ${m.done ? "text-muted line-through" : "text-ink"}`}
            >
              {m.title}
            </label>
            <button
              type="button"
              onClick={() => onDelete(m.id)}
              aria-label={`Remove milestone: ${m.title}`}
              className="focus-ring flex h-11 w-11 items-center justify-center rounded text-xs text-muted hover:text-danger"
            >
              &times;
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
