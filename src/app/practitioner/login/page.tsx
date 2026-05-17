"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function PractitionerLogin() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authErr || !data.user) {
      setError("Invalid email or password.");
      setLoading(false);
      return;
    }

    // Verify the user is an org_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "org_admin" && profile?.role !== "bp_admin") {
      await supabase.auth.signOut();
      setError("This account does not have practitioner access.");
      setLoading(false);
      return;
    }

    router.push("/practitioner");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">BioPrecision</h1>
          <p className="text-sm text-gray-500 mt-1">Practitioner Portal</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@clinic.com"
              autoFocus
              autoComplete="email"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-40"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          {resetSent ? (
            <p className="text-xs text-emerald-600">Check your email for a password reset link.</p>
          ) : (
            <button
              type="button"
              onClick={async () => {
                if (!email.trim()) { setError("Enter your email first."); return; }
                setLoading(true);
                const supabase = createClient();
                await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
                  redirectTo: `${window.location.origin}/practitioner/login`,
                });
                setResetSent(true);
                setLoading(false);
              }}
              className="text-xs text-gray-400 hover:text-gray-600 underline"
            >
              No password? Send reset email
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
