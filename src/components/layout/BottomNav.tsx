"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FlaskConical, CheckSquare, MessageCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/",            label: "Home",     icon: Home          },
  { href: "/lab-results", label: "Labs",     icon: FlaskConical  },
  { href: "/actions",     label: "Protocol", icon: CheckSquare   },
  { href: "/coach",       label: "Coach",    icon: MessageCircle },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <nav
      className="bottom-nav fixed bottom-0 z-50 flex justify-around items-center h-16 px-2"
      style={{
        background: "rgba(255,255,255,0.92)",
        borderTop: "1px solid var(--border)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        width: "100%",
        maxWidth: 430,
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-1 px-4 py-1.5">
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} color={active ? "var(--accent)" : "var(--text3)"} />
            <span className="text-[10px] font-medium" style={{ color: active ? "var(--accent)" : "var(--text3)" }}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
