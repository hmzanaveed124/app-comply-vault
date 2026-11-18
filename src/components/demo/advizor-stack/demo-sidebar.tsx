"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Home,
  ListChecks,
  Shield,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { DEMO_BASE_PATH, QUEUE_ITEMS } from "./demo-data";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

const NAV_ITEMS: NavItem[] = [
  { href: DEMO_BASE_PATH, label: "Home", icon: Home },
  {
    href: `${DEMO_BASE_PATH}/queue`,
    label: "Review queue",
    icon: ListChecks,
    badge: QUEUE_ITEMS.length,
  },
  { href: `${DEMO_BASE_PATH}/sources`, label: "Sources", icon: ArrowLeftRight },
  {
    href: `${DEMO_BASE_PATH}/cockpit`,
    label: "Compliance cockpit",
    icon: SlidersHorizontal,
  },
];

export function DemoSidebar() {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === DEMO_BASE_PATH) return pathname === DEMO_BASE_PATH;
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <aside className="flex w-52 shrink-0 flex-col gap-7 bg-sidebar-bg px-3.5 py-5">
      <Link href={DEMO_BASE_PATH} className="flex items-center gap-2 px-1">
        <span
          className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-sidebar-surface"
          aria-hidden
        >
          <Shield className="h-3.5 w-3.5 text-sidebar-text-bright" />
        </span>
        <span className="text-sm font-semibold text-sidebar-text-bright">
          ComplyVault
        </span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "bg-sidebar-surface text-sidebar-text-bright"
                  : "text-sidebar-text hover:bg-sidebar-border/60",
              )}
              aria-current={active ? "page" : undefined}
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 shrink-0 opacity-90" />
                {item.label}
              </span>
              {item.badge !== undefined ? (
                <span className="rounded-lg bg-semantic-warning/90 px-1.5 py-px text-[11px] font-medium text-warning-text">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto text-[11px] leading-relaxed text-sidebar-muted">
        AdvizorStack Network
        <br />
        Illustrative data
      </div>
    </aside>
  );
}
