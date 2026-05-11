"use client";

import { useState } from "react";
import { verifyBiometric } from "@/lib/webauthn";

interface Props {
  onUnlock: () => void;
}

export default function BiometricLock({ onUnlock }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleUnlock() {
    setLoading(true);
    setError("");
    const ok = await verifyBiometric();
    if (ok) {
      onUnlock();
    } else {
      setError("Verification failed. Try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: "var(--bg)" }}
    >
      <div className="flex flex-col items-center gap-8 px-8 text-center">

        {/* Logo */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--accent)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
          </svg>
        </div>

        <div>
          <h1 className="text-[26px] font-bold" style={{ color: "var(--text1)", letterSpacing: "-0.03em" }}>
            BioPrecision
          </h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--text2)" }}>
            Verify to continue
          </p>
        </div>

        {/* Biometric button */}
        <button
          onClick={handleUnlock}
          disabled={loading}
          className="flex flex-col items-center gap-3 disabled:opacity-50"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{
              background: loading ? "var(--accent-lo)" : "var(--surface)",
              border: `2px solid ${loading ? "var(--accent)" : "var(--border)"}`,
              boxShadow: "0 4px 24px rgba(37,99,235,0.12)",
            }}
          >
            {loading ? (
              <svg className="animate-spin" width="32" height="32" viewBox="0 0 24 24" fill="none"
                stroke="var(--accent)" strokeWidth="2" strokeLinecap="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              /* Face ID icon */
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none"
                stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M16 3h3a2 2 0 0 1 2 2v3" />
                <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                <path d="M9 10h.01" />
                <path d="M15 10h.01" />
                <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                <path d="M12 7v3" />
              </svg>
            )}
          </div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--accent)" }}>
            {loading ? "Verifying…" : "Use Face ID"}
          </p>
        </button>

        {error && (
          <p className="text-[13px]" style={{ color: "var(--red)" }}>{error}</p>
        )}

      </div>
    </div>
  );
}
