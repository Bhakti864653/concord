"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

type UserType = "mentee" | "mentor";

export default function SignupPage() {
  const router = useRouter();
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
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 p-6">
      <Link href="/" className="flex items-center gap-2 self-start">
        <Logo />
        <span className="font-medium text-ink">Concord</span>
      </Link>
      <div className="flex flex-col gap-6 rounded-lg border border-line bg-paper-raised p-6">
        <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
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
            className="rounded-md bg-ink px-3 py-2 font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
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
