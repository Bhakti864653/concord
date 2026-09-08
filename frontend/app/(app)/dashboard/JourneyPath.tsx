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
      <svg width="26" height="20" viewBox="0 0 28 24" aria-hidden="true">
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
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <path d="M5 12l4 4L19 6" />
      </svg>
    );
  }

  switch (stepKey) {
    case "preferences":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" aria-hidden="true">
          <path d="M4 6h16M4 12h10M4 18h13" />
        </svg>
      );
    case "message":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" aria-hidden="true">
          <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      );
    case "schedule":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" aria-hidden="true">
          <rect x="3" y="10" width="18" height="11" rx="2" />
          <path d="M7 10V7a5 5 0 0110 0v3" />
        </svg>
      );
    default:
      return null;
  }
}

export default function JourneyPath({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="relative flex flex-col">
      <div aria-hidden="true" className="absolute bottom-7 left-[27px] top-7 w-0.5 bg-line" />
      {steps.map((step) => {
        const nodeSize = step.milestone ? "h-16 w-16" : "h-14 w-14";
        const nodeClasses =
          step.status === "done"
            ? "bg-mentor text-paper"
            : step.status === "current"
              ? "bg-accord-glow text-ink shadow-[0_0_0_6px_var(--accord-tint)]"
              : "border-2 border-line bg-paper-raised text-muted";

        const content = (
          <div className="relative flex items-start gap-4 py-3">
            <div
              className={`relative z-10 flex ${nodeSize} shrink-0 items-center justify-center rounded-full border-4 border-paper ${nodeClasses}`}
            >
              <StepIcon stepKey={step.key} status={step.status} milestone={step.milestone} />
            </div>
            <div className={`flex-1 pt-2 ${step.status === "locked" ? "opacity-60" : ""}`}>
              <p className="font-semibold text-ink">{step.label}</p>
              <p className="text-sm text-muted">{step.detail}</p>
              {step.status === "current" && (
                <span className="mt-1.5 inline-block rounded-full bg-accord-tint px-2 py-0.5 text-xs font-semibold text-accord">
                  {step.milestone ? "Waiting" : "You are here"}
                </span>
              )}
            </div>
          </div>
        );

        return step.href ? (
          <Link key={step.key} href={step.href} className="rounded-xl transition-opacity hover:opacity-80">
            {content}
          </Link>
        ) : (
          <div key={step.key}>{content}</div>
        );
      })}
    </div>
  );
}
