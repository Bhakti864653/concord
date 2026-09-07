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
      </div>
    </main>
  );
}
