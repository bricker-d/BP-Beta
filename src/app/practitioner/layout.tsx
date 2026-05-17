"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClinic } from "@/lib/useClinic";

const NAV = [
  { href: "/practitioner",           label: "Patients",   icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/practitioner/protocols", label: "Protocols",  icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
];

export default function PractitionerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const clinic = useClinic();

  // Login page renders without the sidebar
  if (pathname === "/practitioner/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-4 fixed inset-y-0 left-0 z-10">
        {/* Brand */}
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-900 leading-tight">{clinic?.name ?? "Loading..."}</p>
            <p className="text-[10px] text-gray-400">Practitioner Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-2">
          <a
            href="/api/clinician/auth"
            onClick={async (e) => {
              e.preventDefault();
              await fetch("/api/clinician/auth", { method: "DELETE" });
              window.location.href = "/";
            }}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </a>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-56 flex-1 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
