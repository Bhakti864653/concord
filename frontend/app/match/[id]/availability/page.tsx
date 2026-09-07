import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import { requireMatch } from "@/lib/matchAuth";
import MatchTabs from "../MatchTabs";
import AvailabilityPicker from "./AvailabilityPicker";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { user, match } = await requireMatch(supabase, id);

  const partnerId =
    user.id === match.mentee_user_id ? match.mentor_user_id : match.mentee_user_id;

  const [{ data: own }, { data: partner }] = await Promise.all([
    supabase.from("availability").select("slots").eq("user_id", user.id).maybeSingle(),
    supabase.from("availability").select("slots").eq("user_id", partnerId).maybeSingle(),
  ]);

  return (
    <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-4 overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none absolute -right-1/3 -top-1/4 -z-10 h-[70%] w-[70%] opacity-40"
      />
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <MatchTabs id={id} active="availability" />
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Find a time to talk
        </h1>
        <p className="text-sm text-muted">
          Mark when you&apos;re generally free - overlapping times are highlighted.
        </p>
      </div>
      <AvailabilityPicker
        userId={user.id}
        initialSlots={own?.slots ?? []}
        partnerSlots={partner?.slots ?? []}
      />
    </main>
  );
}
