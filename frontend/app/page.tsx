import Link from "next/link";
import Logo from "@/components/Logo";
import { buttonClasses } from "@/components/ui/Button";
import TryDemoButton from "@/components/TryDemoButton";
import PageTransition from "@/components/PageTransition";
import LandingJourneyVisual from "@/components/landing/LandingJourneyVisual";

export default function Home() {
  return (
    <PageTransition>
    <main className="relative flex min-h-screen flex-1 items-center overflow-hidden px-6 py-10 sm:px-12 sm:py-16">
      <div
        aria-hidden="true"
        className="concord-mark-fade concord-glow pointer-events-none fixed inset-0 -z-10"
      />
      {/* "Two journeys" - the interactive 3D introduction of the app's
          convergence metaphor, layered above the flat ambient glow and
          behind all hero copy/buttons (pointer-events disabled throughout,
          see LandingJourneyVisual/ConcordSceneCanvas). Degrades to a static
          SVG of the same motif under reduced motion, no WebGL, or before
          its JS chunk has loaded. */}
      <LandingJourneyVisual />

      <div className="relative mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-center gap-12 lg:grid-cols-[1.15fr_.85fr]">
        <div className="flex flex-col gap-8">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-sm font-medium tracking-tight text-muted">Concord</span>
          </div>

          <div className="flex flex-col gap-8">
            <h1 className="font-display text-6xl leading-[0.98] font-semibold tracking-tight text-ink sm:text-7xl">
              Find the mentor who already walked your path.
            </h1>

            <p className="max-w-lg text-lg text-muted">
              Mentees and mentors each rank who they&apos;d most want to work with.
              Concord matches both sides with stable matching, so the pairing
              holds up - not a popularity contest, not a coin flip.
            </p>

            <div className="flex flex-wrap items-start gap-3">
              <Link href="/signup" className={buttonClasses("primary")}>
                Sign up
              </Link>
              <Link href="/login" className={buttonClasses("secondary")}>
                Log in
              </Link>
              <TryDemoButton />
            </div>

            <HowItWorks />

            <div className="flex gap-4">
              <Link href="/how-it-works" className="focus-ring text-xs text-muted underline hover:text-ink">
                How the matching algorithm works
              </Link>
              <Link href="/community-guidelines" className="focus-ring text-xs text-muted underline hover:text-ink">
                Community guidelines
              </Link>
            </div>
          </div>
        </div>

        {/* A fictional, fabricated preview of what a completed match looks
            like - fills what used to be an almost-empty right half on wide
            screens with an actual product glimpse instead of decoration. */}
        <MatchPreview />
      </div>
    </main>
    </PageTransition>
  );
}

function MatchPreview() {
  return (
    <div aria-hidden="true" className="hidden justify-self-center lg:block">
      <div className="concord-lift w-full max-w-sm rounded-[22px] border border-line bg-paper-raised p-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-accord">
          <svg width="18" height="14" viewBox="0 0 28 24">
            <circle cx="10" cy="12" r="9" fill="var(--mentee-glow)" fillOpacity="0.7" />
            <circle cx="18" cy="12" r="9" fill="var(--mentor-glow)" fillOpacity="0.9" />
          </svg>
          You&apos;ve been matched!
        </div>

        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mentee-tint text-sm font-bold text-mentee">
            AK
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Amara K.</p>
            <p className="text-xs text-muted">Mentee - breaking into product design</p>
          </div>
        </div>

        <div className="my-2 ml-5 h-5 w-0.5 bg-line" />

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mentor-tint text-sm font-bold text-mentor">
            JP
          </div>
          <div>
            <p className="text-sm font-semibold text-ink">Jordan P.</p>
            <p className="text-xs text-muted">Mentor - 8 years in product design</p>
          </div>
        </div>

        <div className="mt-5 rounded-[var(--radius-control)] bg-accord-tint p-3 text-xs text-accord">
          You both mentioned user research - ask them what got them started.
        </div>
      </div>
    </div>
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
