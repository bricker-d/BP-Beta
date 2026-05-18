"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

const TESTFLIGHT_URL = "https://testflight.apple.com/join/PLACEHOLDER";

export default function PatientAcceptInvite() {
  const searchParams = useSearchParams();
  const supabase     = createClient();

  const [password,  setPassword]  = useState("");
  const [password2, setPassword2] = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [done,      setDone]      = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) setSessionReady(true);
        else setError("Invalid or expired invite link.");
      });
      return;
    }
    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) setError("This invite link is invalid or has expired. Contact your clinic.");
      else setSessionReady(true);
    });
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== password2) { setError("Passwords do not match."); return; }

    setLoading(true);
    setError("");

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }

    setDone(true);
    setLoading(false);
  }

  if (!sessionReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-400">Verifying invite…</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Password set</h1>
          <p className="text-sm text-gray-500 mb-8">
            Your account is ready. Download BioPrecision to start your protocol.
          </p>
          <a
            href={TESTFLIGHT_URL}
            className="block w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm text-center mb-4"
          >
            Download on TestFlight
          </a>
          <p className="text-xs text-gray-400">
            Open the app, tap <strong>Sign in</strong>, and use the email and password you just set.
            Your protocol is already waiting for you.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 flex items-center justify-center mx-auto mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to your protocol</h1>
          <p className="text-sm text-gray-500 mt-1">
            Set a password to activate your account. Then download the app.
          </p>
        </div>

        {error ? (
          <p className="text-sm text-red-500 text-center">{error}</p>
        ) : (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Confirm password
              </label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Re-enter password"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password || !password2}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm disabled:opacity-40"
            >
              {loading ? "Setting up…" : "Activate account →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
