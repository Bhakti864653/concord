import Link from "next/link";
import Logo from "@/components/Logo";
import Card from "@/components/ui/Card";
import Sandbox from "./Sandbox";
import PageTransition from "@/components/PageTransition";

const STEPS = [
  {
    title: "Everyone ranks who they'd want",
    body: "Each mentee ranks the mentors they'd most want to work with. Each mentor ranks the mentees they'd most want to work with. Neither side sees the other's list.",
  },
  {
    title: "Mentees propose, one at a time",
    body: "Starting with their #1 choice, an unmatched mentee \"proposes\" to a mentor.",
  },
  {
    title: "A mentor holds their best offers so far",
    body: "A mentor tentatively holds the best mentee(s) who've proposed - up to however many spots (capacity) they have. A better proposal later can bump someone already held, who then goes back and proposes to their next choice.",
  },
  {
    title: "Repeat until everyone has run out of options",
    body: "This continues until every mentee is either held by a mentor or has been rejected by everyone on their list. What's left is stable: no mentee-mentor pair would both rather be with each other than with who they ended up with.",
  },
];

export default function HowItWorksPage() {
  return (
    <PageTransition>
    <main className="relative w-full overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none fixed inset-0 -z-10"
      />
      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-8">
      <Link href="/" className="focus-ring flex items-center gap-2 self-start rounded-lg">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          How matching actually works
        </h1>
        <p className="text-sm text-muted">
          Concord uses the Gale-Shapley stable matching algorithm - the same idea behind matching
          medical residents to hospitals. Here&apos;s the whole thing, no black box.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <Card key={step.title} padding="sm" className="flex gap-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-accord text-sm font-semibold text-accord">
              {i + 1}
            </span>
            <div>
              <h2 className="font-medium text-ink">{step.title}</h2>
              <p className="mt-1 text-sm text-muted">{step.body}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-semibold tracking-tight text-ink">
          Try it yourself
        </h2>
        <p className="text-sm text-muted">
          Three fictional mentees, three fictional mentors. Reorder anyone&apos;s preferences,
          adjust a mentor&apos;s capacity, then run the algorithm and watch it work step by step.
        </p>
      </div>

      <Sandbox />
      </div>
    </main>
    </PageTransition>
  );
}
