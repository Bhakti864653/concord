"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Hard navigation - see signup/page.tsx for why, same cookie-timing
    // reasoning applies to a fresh sign-in.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/dashboard";
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 overflow-hidden p-6">
      <div
        aria-hidden="true"
        className="concord-glow pointer-events-none absolute -top-1/3 left-1/2 -z-10 h-[120%] w-[160%] -translate-x-1/2"
      />
      <Link href="/" className="relative flex items-center gap-2 self-start">
        <Logo />
        <span className="font-display font-medium text-ink">Concord</span>
      </Link>
      <div className="relative flex flex-col gap-6 rounded-2xl border border-line bg-paper-raised p-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Log in</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-none"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-ink px-3 py-2 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
        <p className="text-sm text-muted">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-ink underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
