import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/layout/BottomNav";

export const metadata: Metadata = {
  title: "BioPrecision",
  description: "AI-powered health intelligence platform",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="mobile-container mx-auto shadow-xl">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
