import Link from "next/link";
import type { JourneyStep, JourneyStepStatus } from "@/lib/journey";

function StepIcon({
  stepKey,
  status,
  milestone,
}: {
  stepKey: string;
  status: JourneyStepStatus;
  milestone?: boolean;
}) {
  if (milestone) {
    return (
      <svg width="18" height="14" viewBox="0 0 28 24" aria-hidden="true">
        <circle
          cx="10"
          cy="12"
          r="9"
          fill={status === "done" ? "var(--mentee-glow)" : "var(--line)"}
          fillOpacity={status === "done" ? 0.7 : 1}
        />
        <circle
          cx="18"
          cy="12"
          r="9"
          fill={status === "done" ? "var(--mentor-glow)" : "var(--line)"}
          fillOpacity={status === "done" ? 0.9 : 1}
        />
      </svg>
    );
  }

  if (status === "done") {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <path d="M5 12l4 4L19 6" />
      </svg>
    );
  }

  switch (stepKey) {
    case "preferences":
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
      );
    case "message":
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      );
    case "schedule":
      return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <rect x="3" y="10" width="18" height="11" rx="2" />
          <path d="M7 10V7a5 5 0 0110 0v3" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * A compact horizontal stepper - replaces the previous tall vertical one
 * (one node per line) so the dashboard's journey display reads as a quick
 * glance, not its own scrolling section. Only the current step's detail
 * text is shown below the row, rather than every step's, to keep this
 * genuinely compact.
 */
export default function JourneyPath({ steps }: { steps: JourneyStep[] }) {
  const current = steps.find((s) => s.status === "current") ?? steps.find((s) => s.status === "done");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((step, i) => {
          const nodeSize = step.milestone ? "h-9 w-9" : "h-7 w-7";
          const nodeClasses =
            step.status === "done"
              ? "bg-mentor text-paper"
              : step.status === "current"
                ? "bg-accord-glow text-ink shadow-[0_0_0_4px_var(--accord-tint)]"
                : "border-2 border-line bg-paper-raised text-muted";

          const node = (
            <div
              className={`flex ${nodeSize} shrink-0 items-center justify-center rounded-full ${nodeClasses} ${step.status === "locked" ? "opacity-60" : ""}`}
              title={step.label}
            >
              <StepIcon stepKey={step.key} status={step.status} milestone={step.milestone} />
            </div>
          );

          return (
            <div key={step.key} className="flex shrink-0 items-center gap-1">
              {step.href ? (
                <Link href={step.href} aria-label={step.label} className="focus-ring rounded-full">
                  {node}
                </Link>
              ) : (
                node
              )}
              {i < steps.length - 1 && <span aria-hidden="true" className="h-0.5 w-4 shrink-0 bg-line sm:w-7" />}
            </div>
          );
        })}
      </div>
      {current && (
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">{current.label}.</span> {current.detail}
        </p>
      )}
    </div>
  );
}
