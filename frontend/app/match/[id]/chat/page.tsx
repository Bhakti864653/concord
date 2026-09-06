import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import Chat from "./Chat";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Same as the reveal page: RLS on `matches` already scopes this to rows
  // the caller is actually part of, so no row back means either the match
  // doesn't exist or isn't theirs - both handled the same way.
  const { data: match } = await supabase
    .from("matches")
    .select("mentee_user_id, mentor_user_id")
    .eq("mentee_user_id", id)
    .maybeSingle();

  if (!match) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <Link href={`/match/${id}`} className="self-start text-sm font-medium text-ink underline">
        Back to match
      </Link>
      <Chat matchId={id} currentUserId={user.id} />
    </main>
  );
}
