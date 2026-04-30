"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FlaskConical, CheckSquare, MessageCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/lab-results", label: "Labs", icon: FlaskConical },
  { href: "/actions", label: "Protocol", icon: CheckSquare },
  { href: "/coach", label: "Coach", icon: MessageCircle },
];

export default function BottomNav() {
  const pathname = usePathname();
  const isOnboarding = pathname?.startsWith("/onboarding");
  if (isOnboarding) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center h-16 px-2"
      style={{
        background: "rgba(13,13,16,0.92)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        maxWidth: 430,
        left: "50%",
        transform: "translateX(-50%)",
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 1.8}
              color={active ? "#a855f7" : "#52525b"}
            />
            <span
              className="text-[10px] font-medium"
              style={{ color: active ? "#a855f7" : "#52525b" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
