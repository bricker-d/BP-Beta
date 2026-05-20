"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

const NAV = [
  { href: "/practitioner",            label: "Patients",  icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/practitioner/protocols",  label: "Protocols", icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
  { href: "/practitioner/outcomes",   label: "Outcomes",  icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
];

const ADMIN_NAV_ITEM = { href: "/practitioner/admin", label: "Admin", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" };

const BYPASS_PATHS = ["/practitioner/login", "/practitioner/accept-invite"];

export default function PractitionerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [role,    setRole]    = useState<string | null>(null);

  useEffect(() => {
    if (BYPASS_PATHS.includes(pathname)) return;

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/practitioner/login"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, organization_id, organizations(name)")
        .eq("id", session.user.id)
        .single();

      if (profile?.role !== "org_admin" && profile?.role !== "bp_admin") {
        await supabase.auth.signOut();
        router.replace("/practitioner/login");
        return;
      }

      const org = profile?.organizations as unknown as { name: string } | null;
      setOrgName(org?.name ?? "My Clinic");
      setRole(profile?.role ?? null);
    });
  }, [pathname]);

  if (BYPASS_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/practitioner/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col py-6 px-4 fixed inset-y-0 left-0 z-10">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12h3l3-8 3 16 3-10 3 5 2-3h3" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-bold text-gray-900 leading-tight">{orgName ?? "Loading..."}</p>
            <p className="text-[10px] text-gray-400">Practitioner Portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {[...NAV, ...(role === "bp_admin" ? [ADMIN_NAV_ITEM] : [])].map(item => {
            const active = pathname === item.href || (item.href !== "/practitioner" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active ? "bg-emerald-50 text-emerald-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-2">
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      <main className="ml-56 flex-1 p-8 min-h-screen">
        {children}
      </main>
    </div>
  );
}
