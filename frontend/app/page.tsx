import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden px-6 py-10 sm:px-12 sm:py-16">
      <div
        aria-hidden="true"
        className="concord-mark-fade concord-glow pointer-events-none absolute -right-1/4 top-0 -z-10 h-full w-full sm:-right-10"
      />

      <div className="relative flex flex-1 flex-col justify-center gap-8 sm:max-w-md">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-sm font-medium tracking-tight text-muted">Concord</span>
        </div>

        <h1 className="font-display text-6xl leading-[0.95] font-semibold tracking-tight text-ink sm:text-7xl">
          Find the mentor who already walked your path.
        </h1>

        <p className="max-w-sm text-lg text-muted">
          Mentees and mentors each rank who they&apos;d most want to work with.
          Concord matches both sides with stable matching, so the pairing
          holds up - not a popularity contest, not a coin flip.
        </p>

        <div className="flex gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-ink px-5 py-2.5 font-medium text-paper transition-opacity hover:opacity-90"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-line px-5 py-2.5 font-medium text-ink transition-colors hover:border-ink"
          >
            Log in
          </Link>
        </div>

        <HowItWorks />

        <div className="flex gap-4">
          <Link href="/how-it-works" className="text-xs text-muted underline hover:text-ink">
            How the matching algorithm works
          </Link>
          <Link href="/community-guidelines" className="text-xs text-muted underline hover:text-ink">
            Community guidelines
          </Link>
        </div>
      </div>
    </main>
  );
}

const STEPS = [
  { label: "Build a profile", color: "mentee" as const },
  { label: "Rank your preferences", color: "mentor" as const },
  { label: "Get matched", color: "accord" as const, milestone: true },
  { label: "Start talking", color: "muted" as const },
  { label: "Schedule a chat", color: "muted" as const },
];

function HowItWorks() {
  return (
    <div className="pt-4">
      <p className="mb-4 text-xs font-semibold tracking-wide text-muted">How it works</p>
      <div className="flex max-w-md items-start gap-1">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex flex-1 items-start">
            <div className="flex flex-1 flex-col items-center gap-2 text-center">
              {step.milestone ? (
                <svg width="30" height="24" viewBox="0 0 28 24" aria-hidden="true">
                  <circle cx="10" cy="12" r="9" fill="var(--mentee-tint)" stroke="var(--mentee)" strokeWidth="1.6" />
                  <circle cx="18" cy="12" r="9" fill="var(--mentor-tint)" stroke="var(--mentor)" strokeWidth="1.6" fillOpacity="0.85" />
                </svg>
              ) : (
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-paper-raised ${
                    step.color === "mentee"
                      ? "border-mentee text-mentee"
                      : step.color === "mentor"
                        ? "border-mentor text-mentor"
                        : "border-line text-muted"
                  }`}
                >
                  <StepGlyph index={i} />
                </span>
              )}
              <p
                className={`text-[11px] leading-tight ${step.milestone ? "font-semibold text-accord" : "text-muted"}`}
              >
                {step.label}
              </p>
            </div>
            {i < STEPS.length - 1 && <div className="mt-[18px] h-0.5 flex-1 bg-line" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function StepGlyph({ index }: { index: number }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.3 };
  if (index === 1) {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M4 6h16M4 12h10M4 18h13" />
      </svg>
    );
  }
  if (index === 3) {
    return (
      <svg {...common} aria-hidden="true">
        <path d="M21 11.5a8.4 8.4 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.4 8.4 0 01-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.4 8.4 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
      </svg>
    );
  }
  if (index === 4) {
    return (
      <svg {...common} aria-hidden="true">
        <rect x="3" y="10" width="18" height="11" rx="2" />
        <path d="M7 10V7a5 5 0 0110 0v3" />
      </svg>
    );
  }
  return (
    <svg {...common} aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20a7 7 0 0114 0" />
    </svg>
  );
}
