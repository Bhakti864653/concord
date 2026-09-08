import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Every page under /match/[id]/* needs the same thing: a logged-in user
 * who is actually a participant in this match. RLS on `matches` already
 * scopes the select to rows the caller is part of, so "no row" covers
 * both "doesn't exist" and "not yours" - both redirect the same way.
 */
export async function requireMatch(supabase: SupabaseServerClient, id: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: match } = await supabase
    .from("matches")
    .select("mentee_user_id, mentor_user_id, status")
    .eq("mentee_user_id", id)
    .maybeSingle();

  if (!match) {
    redirect("/dashboard");
  }

  return { user, match };
}
