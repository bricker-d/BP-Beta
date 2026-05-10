"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { useHealthStore } from "@/store/useHealthStore";

export default function LoginPage() {
  const router = useRouter();
  const { loadFromSupabase } = useHealthStore();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      if (mode === "signup") {
        // Sign up — disable email confirmation requirement via options
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: undefined },
        });
        if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

        // If session is immediately available (email confirm disabled), we're in
        // If not, sign in manually
        if (!data.session) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (signInErr) {
            // Email confirmation required — tell the user clearly
            if (signInErr.message.toLowerCase().includes("confirm") ||
                signInErr.message.toLowerCase().includes("not confirmed")) {
              setError("Account created — check your email to confirm it, then sign in.");
            } else {
              setError(signInErr.message);
            }
            setLoading(false);
            return;
          }
        }
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInErr) {
          setError(
            signInErr.message === "Invalid login credentials"
              ? "Wrong email or password. Try again."
              : signInErr.message
          );
          setLoading(false);
          return;
        }
      }

      // Auth succeeded — hydrate store from Supabase then navigate
      await loadFromSupabase();
      const next = new URLSearchParams(window.location.search).get("next") ?? "/";
      router.replace(next);

    } catch (err) {
      // Network-level failures (Supabase unreachable, etc.)
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.toLowerCase().includes("fetch")
          ? "Cannot reach the server. Check your connection and try again."
          : msg
      );
      setLoading(false);
    }
  }

  const inputStyle = {
    color: "var(--text1)" as const,
    background: "var(--surface2)" as const,
    border: "1.5px solid var(--border)" as const,
    borderRadius: 12,
    padding: "12px 14px",
    fontSize: 15,
    width: "100%",
    outline: "none",
  };

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

        {/* Mode toggle */}
        <div className="flex rounded-xl p-1 mb-5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {(["signin", "signup"] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className="flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all"
              style={{
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "#fff" : "var(--text2)",
              }}
            >
              {m === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email address"
            required
            autoFocus
            style={inputStyle}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === "signup" ? "Create a password (6+ chars)" : "Password"}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div className="rounded-xl px-3 py-2.5"
              style={{ background: "rgba(255,59,48,0.08)", border: "1px solid rgba(255,59,48,0.2)" }}>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--red)" }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={!email.trim() || password.length < 6 || loading}
            className="btn-primary disabled:opacity-40"
            style={{ marginTop: 8 }}
          >
            {loading
              ? (mode === "signup" ? "Creating account..." : "Signing in...")
              : (mode === "signup" ? "Create account" : "Sign in")}
          </button>
        </form>

        <p className="text-center text-[12px] mt-5" style={{ color: "var(--text3)" }}>
          {mode === "signup" ? "Already have an account? " : "New here? "}
          <button
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
            className="font-semibold"
            style={{ color: "var(--accent)" }}
          >
            {mode === "signup" ? "Sign in" : "Create account"}
          </button>
        </p>

      </div>
    </div>
  );
}
