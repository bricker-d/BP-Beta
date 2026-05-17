"use client";

import { usePathname } from "next/navigation";
import BottomNav from "./BottomNav";

const PORTAL_PREFIXES = ["/practitioner", "/clinician", "/privacy"];

export default function ClientLayout({ children, sidebar }: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  const pathname = usePathname();
  const isPortal = PORTAL_PREFIXES.some(p => pathname.startsWith(p));

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <>
      <div id="device-frame">
        <div className="mobile-container mx-auto">
          {children}
          <BottomNav />
        </div>
      </div>
      {sidebar}
    </>
  );
}
