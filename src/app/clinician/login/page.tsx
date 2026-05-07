"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClinicianLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/clinician/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/clinician");
    } else {
      setError("Incorrect password");
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: "40px 48px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)",
        width: "100%",
        maxWidth: 400,
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
            Frame Longevity
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: 0 }}>
            Clinician Dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
            Access Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Enter clinician password"
            autoFocus
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 10,
              border: `1.5px solid ${error ? "#fca5a5" : "#e5e7eb"}`,
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 8,
            }}
          />
          {error && (
            <p style={{ fontSize: 13, color: "#dc2626", margin: "0 0 12px" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 10,
              backgroundColor: loading || !password ? "#e5e7eb" : "#9333ea",
              color: loading || !password ? "#9ca3af" : "#fff",
              fontWeight: 700,
              fontSize: 15,
              border: "none",
              cursor: loading || !password ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Verifying..." : "Access Dashboard"}
          </button>
        </form>

        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 24 }}>
          BioPrecision · Frame Longevity · Protected Access
        </p>
      </div>
    </div>
  );
}
