"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FlaskConical, CheckSquare, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/lab-results", label: "Labs", icon: FlaskConical },
  { href: "/actions", label: "Actions", icon: CheckSquare },
  { href: "/coach", label: "Coach", icon: MessageCircle },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-16 px-2 safe-area-pb z-50">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-all",
              active ? "text-purple-500" : "text-text-muted"
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={cn("text-[10px] font-medium", active ? "text-purple-500" : "text-text-muted")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
