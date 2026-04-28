"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PROVIDER_META: Record<string, { name: string; emoji: string; color: string }> = {
  oura:  { name: "Oura Ring",  emoji: "💍", color: "#9333ea" },
  whoop: { name: "WHOOP",      emoji: "🔴", color: "#dc2626" },
  garmin:{ name: "Garmin",     emoji: "⌚", color: "#007dc5" },
};

function ConnectSuccessContent() {
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider") ?? "oura";
  const patientId = searchParams.get("patientId");
  const meta = PROVIDER_META[provider] ?? PROVIDER_META.oura;
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Try deep link back to app
    const deepLink = `bioprecision://wearable-connected?provider=${provider}&patientId=${patientId}`;
    window.location.href = deepLink;

    // Countdown for manual close
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [provider, patientId]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f9fafb",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      padding: "24px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{meta.emoji}</div>

      <div style={{
        width: 56, height: 56,
        borderRadius: 28,
        backgroundColor: "#dcfce7",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
        fontSize: 28,
      }}>✓</div>

      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
        {meta.name} Connected
      </h1>

      <p style={{ fontSize: 16, color: "#6b7280", margin: "0 0 32px", maxWidth: 320, lineHeight: 1.5 }}>
        Your {meta.name} data is now syncing with BioPrecision. Your AI coach will incorporate your wearable data into your daily actions.
      </p>

      <p style={{ fontSize: 13, color: "#9ca3af" }}>
        {countdown > 0
          ? `Returning to app in ${countdown}s...`
          : "You can close this tab and return to the app."}
      </p>

      <a
        href={`bioprecision://wearable-connected?provider=${provider}&patientId=${patientId}`}
        style={{
          marginTop: 16,
          padding: "12px 24px",
          backgroundColor: meta.color,
          color: "#fff",
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 15,
          textDecoration: "none",
        }}
      >
        Open BioPrecision
      </a>
    </div>
  );
}

export default function ConnectSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Loading...</div>}>
      <ConnectSuccessContent />
    </Suspense>
  );
}
