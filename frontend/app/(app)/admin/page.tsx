import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-extrabold uppercase tracking-widest text-mentee">
          Restricted administrator view
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
          Run a healthy matching program.
        </h1>
        <p className="text-sm text-muted">
          Round status, reports, and mentor capacity - visible only to the admin account.
        </p>
      </div>
      <AdminDashboard />
    </div>
  );
}
