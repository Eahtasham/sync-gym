"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  History,
  Home,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = { href: string; label: string; icon: LucideIcon; match: RegExp };

const TABS: Tab[] = [
  { href: "/dashboard", label: "Home", icon: Home, match: /^\/dashboard/ },
  { href: "/workouts", label: "Workouts", icon: Dumbbell, match: /^\/workouts/ },
  { href: "/history", label: "History", icon: History, match: /^\/history/ },
  { href: "/progress", label: "Progress", icon: TrendingUp, match: /^\/progress/ },
  { href: "/settings", label: "Settings", icon: Settings, match: /^\/settings/ },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom">
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = tab.match.test(pathname);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "scale-110")} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
