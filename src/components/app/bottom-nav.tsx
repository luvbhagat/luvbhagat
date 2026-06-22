"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Clapperboard, Plus, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

// The persistent bottom tab bar (PRD: navigation/theming addendum).
// "Create" sits in the center, raised, with the brand gradient.
const tabs: { href: string; label: string; icon: typeof Home; center?: boolean }[] = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/projects", label: "Projects", icon: Clapperboard },
  { href: "/create", label: "Create", icon: Plus, center: true },
  { href: "/history", label: "History", icon: Clock },
  { href: "/account", label: "Account", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="glass mx-auto flex max-w-md items-center justify-between rounded-2xl px-4 py-2 shadow-xl">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          const Icon = tab.icon;

          if (tab.center) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label={tab.label}
                className="-mt-8 flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--brand-pink),var(--brand-cyan))] text-[#1a0e2e] shadow-lg transition-transform hover:scale-105"
              >
                <Icon className="size-7" />
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "fill-primary/20")} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}