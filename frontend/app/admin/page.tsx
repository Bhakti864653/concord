import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";
import AdminDashboard from "./AdminDashboard";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const isAdmin = user.email?.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase();
  if (!isAdmin) redirect("/dashboard");

  return (
    <main className="relative mx-auto flex w-full max-w-3xl flex-col gap-6 overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none absolute -right-1/3 -top-1/4 -z-10 h-[70%] w-[70%] opacity-40"
      />
      <Link href="/dashboard" className="flex items-center gap-2">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Admin operations
        </h1>
        <p className="text-sm text-muted">
          Round status, reports, and mentor capacity - visible only to the admin account.
        </p>
      </div>
      <AdminDashboard />
    </main>
  );
}
