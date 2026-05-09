"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--accent-lo)", border: "1px solid var(--accent-mid)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
            </svg>
          </div>
          <h1 className="text-[22px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.02em" }}>
            BioPrecision
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--text2)" }}>
            Your personal health intelligence
          </p>
        </div>

        {sent ? (
          <div className="rounded-2xl px-5 py-6 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(52,199,89,0.1)" }}>
              <svg width="20" height="16" viewBox="0 0 20 16" fill="none">
                <path d="M2 8l5 5L18 2" stroke="var(--green)" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-[16px] font-bold" style={{ color: "var(--text1)" }}>
              Check your email
            </p>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--text2)" }}>
              We sent a sign-in link to <span className="font-semibold" style={{ color: "var(--text1)" }}>{email}</span>.
              Tap it to open your account.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="mt-5 text-[13px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-2xl px-5 py-5 space-y-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div>
                <label className="block text-[12px] font-semibold mb-2"
                  style={{ color: "var(--text2)" }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="w-full outline-none text-[15px] bg-transparent"
                  style={{
                    color: "var(--text1)",
                    borderBottom: "1.5px solid var(--border)",
                    paddingBottom: "8px",
                  }}
                />
              </div>

              {error && (
                <p className="text-[12px]" style={{ color: "var(--red)" }}>{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="btn-primary disabled:opacity-40"
            >
              {loading ? "Sending..." : "Send sign-in link"}
            </button>

            <p className="text-center text-[12px]" style={{ color: "var(--text3)" }}>
              No password needed. We email you a secure link.
            </p>
          </form>
        )}

      </div>
    </div>
  );
}
