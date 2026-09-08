"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

type UserType = "mentee" | "mentor";

export default function SignupPage() {
  const [userType, setUserType] = useState<UserType>("mentee");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // If a previous account's session is still active in this browser (e.g.
    // logout hasn't fully propagated yet), sign it out first so the new
    // account's session - not a leftover one - is what ends up active.
    await supabase.auth.signOut();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { user_type: userType } },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // A hard navigation, not router.push, so the next page's server render
    // is guaranteed to see the just-written session cookie rather than a
    // stale one from a client-side transition that outraces the cookie write.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/onboarding";
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
      <div className="concord-lift relative flex flex-col gap-6 rounded-2xl border border-line bg-paper-raised p-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Create your account</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-ink">I am a...</legend>
            <div className="flex gap-3">
              <label
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition-colors ${
                  userType === "mentee"
                    ? "border-mentee bg-mentee-tint font-medium text-ink"
                    : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="userType"
                  value="mentee"
                  checked={userType === "mentee"}
                  onChange={() => setUserType("mentee")}
                  className="sr-only"
                />
                Mentee
              </label>
              <label
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-center text-sm transition-colors ${
                  userType === "mentor"
                    ? "border-mentor bg-mentor-tint font-medium text-ink"
                    : "border-line text-muted"
                }`}
              >
                <input
                  type="radio"
                  name="userType"
                  value="mentor"
                  checked={userType === "mentor"}
                  onChange={() => setUserType("mentor")}
                  className="sr-only"
                />
                Mentor
              </label>
            </div>
          </fieldset>
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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-line bg-paper px-3 py-2 text-ink focus:border-ink focus:outline-none"
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-mentee px-3 py-2.5 font-bold text-paper-raised transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-ink underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
