import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

export const metadata: Metadata = {
  title: "BioPrecision",
  description: "Your daily health protocol, personalized to your biology.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const sidebar = (
  <div className="desktop-sidebar">
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "#5B4FE9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" /></svg>
        </div>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>BioPrecision</span>
      </div>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, lineHeight: 1.6 }}>
        Your daily health protocol, built from your biology. Lab results → ranked actions → accountability loop.
      </p>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {[
        { label: "40+ biomarkers", sub: "Functional medicine ranges" },
        { label: "Evidence-graded", sub: "Every action cites the mechanism" },
        { label: "AI coach", sub: "Knows your full chart" },
        { label: "Daily protocol", sub: "5 actions tied to your numbers" },
      ].map(f => (
        <div key={f.label} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#5B4FE9", marginTop: 5, flexShrink: 0 }} />
          <div>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600 }}>{f.label}</p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{f.sub}</p>
          </div>
        </div>
      ))}
    </div>
    <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, lineHeight: 1.5 }}>
      For educational use. Not a substitute for medical advice.
    </p>
  </div>
);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <ClientLayout sidebar={sidebar}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
