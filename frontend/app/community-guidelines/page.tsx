import Link from "next/link";
import Logo from "@/components/Logo";
import Card from "@/components/ui/Card";

const SECTIONS = [
  {
    title: "Be respectful",
    body: "Mentors and mentees come from different backgrounds and experience levels. Disagreement is fine; disrespect, harassment, or discrimination isn't.",
  },
  {
    title: "Show up, or say so",
    body: "If you can't make a session or need to step back, tell your match - or use \"Request a rematch\" so both of you can move forward without awkwardness or blame.",
  },
  {
    title: "Keep it on-topic and appropriate",
    body: "This is a mentorship platform. Conversations should stay focused on the mentee's goals - not romantic, financial, or otherwise inappropriate requests.",
  },
  {
    title: "Protect privacy",
    body: "Don't share someone else's personal information outside the platform, and don't ask your match for information they haven't chosen to share.",
  },
  {
    title: "Report, don't retaliate",
    body: "If something feels wrong, use the report/block tools on the match or on a specific message. You can also end a match immediately at any time - no explanation owed to the other person.",
  },
];

export default function CommunityGuidelinesPage() {
  return (
    <main className="relative w-full overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none fixed inset-0 -z-10"
      />
      <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Link href="/" className="focus-ring flex items-center gap-2 self-start rounded-lg">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Community guidelines
        </h1>
        <p className="text-sm text-muted">
          A few ground rules for a good mentorship experience on Concord.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {SECTIONS.map((s) => (
          <Card key={s.title} padding="sm" className="block">
            <h2 className="font-medium text-ink">{s.title}</h2>
            <p className="mt-1 text-sm text-muted">{s.body}</p>
          </Card>
        ))}
      </div>
      </div>
    </main>
  );
}
