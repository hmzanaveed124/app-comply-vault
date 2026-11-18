"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "~/lib/toast";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  CheckSquare,
  BriefcaseBusiness,
  FileText,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shield,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { ROLE_CONFIG, type WorkspaceRoleKey } from "~/lib/role-config";
import { isRelease1DemoEnabled } from "~/lib/feature-flags";
import { cn } from "~/lib/utils";
import { WorkspaceDropdown } from "~/components/layout/workspace-dropdown";
import { useSidebar } from "~/components/layout/sidebar-context";
import { fetchTeamMembers, workspaceDtoToWorkspace } from "~/lib/workspace-api";
import type { TeamMember, Workspace } from "~/lib/types";
import type { WorkspaceListItemDto } from "~/lib/workspace-types";

export type AppSidebarProps = {
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  activeWorkspaceId: string;
  workspaces: WorkspaceListItemDto[];
  reviewQueueCount?: number;
};

function initials(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (n.length > 0) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = (email ?? "").trim();
  if (e.length > 0) return e.slice(0, 2).toUpperCase();
  return "CV";
}

type AppSidebarPanelProps = {
  userEmail?: string | null;
  userName?: string | null;
  userRole?: string | null;
  activeWorkspaceId: string;
  activeWorkspace: Workspace | null;
  workspaceList: Workspace[];
  workspaces: WorkspaceListItemDto[];
  teamMembers: TeamMember[];
  teamLoading: boolean;
  reviewQueueCount: number;
  pathname: string | null;
  collapsed: boolean;
  onToggleCollapse?: () => void;
  onSelectWorkspace: (ws: Workspace) => void;
  onInvite: () => void;
  onSettings: () => void;
  onOpenChange: (open: boolean) => void;
  onNavigate: () => void;
};

function AppSidebarPanel({
  userEmail,
  userName,
  userRole,
  activeWorkspaceId,
  activeWorkspace,
  workspaceList,
  workspaces,
  teamMembers,
  teamLoading,
  reviewQueueCount,
  pathname,
  collapsed,
  onToggleCollapse,
  onSelectWorkspace,
  onInvite,
  onSettings,
  onOpenChange,
  onNavigate,
}: AppSidebarPanelProps): React.JSX.Element {
  const isActive = (path: string): boolean => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname?.startsWith(path) ?? false;
  };

  const navItems: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/supervision", label: "Supervision", icon: Shield },
    { href: "/priority-inbox", label: "Priority Inbox", icon: CheckSquare },
    { href: "/interaction-log", label: "Interaction Log", icon: FileText },
    {
      href: "/review",
      label: "Review Queue",
      icon: CheckSquare,
      badge: reviewQueueCount > 0 ? reviewQueueCount : undefined,
    },
    { href: "/upload", label: "Upload", icon: Upload },
    ...(userRole === "OWNER_CCO" || userRole === "MEMBER"
      ? [{ href: "/compliance-cockpit", label: "Compliance Cockpit", icon: SlidersHorizontal }]
      : []),
    ...(userRole === "OWNER_CCO"
      ? [
          { href: "/integrations", label: "Integrations", icon: Settings },
          { href: "/audit-logs", label: "Audit Logs", icon: Shield },
        ]
      : []),
    ...(isRelease1DemoEnabled()
      ? [
          { href: "/needs-attention", label: "Needs Attention", icon: CheckSquare },
          ...(userRole === "OWNER_CCO"
            ? [
                {
                  href: "/document-request",
                  label: "Document Request",
                  icon: Mail,
                },
              ]
            : []),
          { href: "/candidate-pack", label: "Candidate Pack", icon: FileText },
          ...(userRole === "OWNER_CCO"
            ? [
                {
                  href: "/partner/portfolio",
                  label: "Partner Portfolio",
                  icon: BriefcaseBusiness,
                },
              ]
            : []),
        ]
      : []),
  ];

  const roleLabel =
    userRole && userRole in ROLE_CONFIG
      ? ROLE_CONFIG[userRole as WorkspaceRoleKey].label
      : "Member";

  return (
    <div className="flex h-full flex-col bg-sidebar-bg font-sans">
      <div
        className={cn(
          "flex items-center py-4",
          collapsed ? "flex-col gap-3 px-2" : "gap-2 px-4",
        )}
      >
        <Link
          href="/dashboard"
          className={cn(
            "flex min-w-0 items-start gap-3",
            collapsed && "justify-center",
          )}
          onClick={onNavigate}
        >
          <div
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-brand to-brand-mid text-[13px] font-bold text-white"
            aria-hidden
          >
            CV
          </div>
          {!collapsed ? (
            <div className="min-w-0 pt-0.5">
              <div className="truncate text-[15px] font-bold tracking-[-0.02em] text-sidebar-text-bright">
                ComplyVault
              </div>
              <div className="text-[9.5px] font-medium uppercase tracking-[0.06em] text-sidebar-muted">
                Compliance Command
              </div>
            </div>
          ) : null}
        </Link>
        {onToggleCollapse ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 shrink-0 text-sidebar-text hover:bg-sidebar-surface hover:text-sidebar-text-light",
                  !collapsed && "ml-auto",
                )}
                onClick={onToggleCollapse}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-[18px] w-[18px]" />
                ) : (
                  <PanelLeftClose className="h-[18px] w-[18px]" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <div className="h-px w-full shrink-0 bg-sidebar-hairline" aria-hidden />

      {!collapsed ? (
        activeWorkspaceId && workspaces.length > 0 && activeWorkspace ? (
          <WorkspaceDropdown
            activeWorkspace={activeWorkspace}
            workspaces={workspaceList}
            teamMembers={teamMembers}
            teamLoading={teamLoading}
            onSelectWorkspace={onSelectWorkspace}
            onInvite={onInvite}
            onSettings={onSettings}
            canInviteTeam={userRole === "OWNER_CCO"}
            onOpenChange={onOpenChange}
          />
        ) : (
          <div className="mx-3 mt-3 mb-1">
            <Link
              href="/workspaces/new"
              className="block rounded-lg border border-sidebar-active-border bg-sidebar-surface px-[10px] py-[9px] text-center text-[12px] font-semibold text-sidebar-text-light hover:bg-sidebar-border"
              onClick={onNavigate}
            >
              Create workspace
            </Link>
          </div>
        )
      ) : null}

      <nav className={cn("flex-1 space-y-1 pb-4", collapsed ? "px-2 pt-2" : "px-2")}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          const button = (
            <Button
              variant="ghost"
              className={cn(
                "h-10 w-full font-normal shadow-none",
                collapsed
                  ? "relative justify-center px-0"
                  : "justify-start gap-3 px-3",
                active
                  ? "bg-brand text-white shadow-[0_2px_8px_rgba(17,122,75,0.15)] hover:bg-brand hover:text-white"
                  : "text-sidebar-text hover:bg-sidebar-surface hover:text-sidebar-text-light",
              )}
              asChild
            >
              <Link href={item.href} onClick={onNavigate}>
                <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" />
                {!collapsed ? (
                  <span className="text-[13px] font-semibold">{item.label}</span>
                ) : null}
                {item.badge !== undefined ? (
                  collapsed ? (
                    <span
                      className={cn(
                        "absolute right-1.5 top-1.5 h-2 w-2 rounded-full",
                        active ? "bg-white" : "bg-semantic-orange",
                      )}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={cn(
                        "ml-auto min-w-[22px] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold",
                        active ? "bg-white/20 text-white" : "bg-semantic-orange text-white",
                      )}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )
                ) : null}
              </Link>
            </Button>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">
                  {item.label}
                  {item.badge !== undefined
                    ? ` (${item.badge > 99 ? "99+" : item.badge})`
                    : ""}
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{button}</div>;
        })}
      </nav>

      <div className="mt-auto">
        <div className="h-px w-full shrink-0 bg-sidebar-hairline" aria-hidden />
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 p-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="flex h-9 w-9 shrink-0 cursor-default items-center justify-center rounded-full bg-gradient-to-br from-brand to-status-online text-[11px] font-semibold text-white"
                  tabIndex={0}
                >
                  {initials(userName, userEmail)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="font-semibold">{userName || userEmail || "User"}</span>
                <span className="ml-1 font-normal opacity-80">· {roleLabel}</span>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 text-sidebar-text hover:bg-sidebar-surface hover:text-sidebar-text-light"
                  onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
                  aria-label="Sign out"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <div className="p-3">
            <div className="flex items-center gap-3 rounded-lg px-1 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-status-online text-[11px] font-semibold text-white">
                {initials(userName, userEmail)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-sidebar-text-light">
                  {userName || userEmail || "User"}
                </div>
                <div className="truncate text-[11px] text-sidebar-muted">
                  {roleLabel}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 text-[11px] text-sidebar-text hover:bg-sidebar-surface hover:text-sidebar-text-light"
                onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
              >
                Sign out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppSidebar({
  userEmail,
  userName,
  userRole,
  activeWorkspaceId,
  workspaces,
  reviewQueueCount = 0,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggleCollapsed } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);

  const workspaceList = useMemo(
    () => workspaces.map(workspaceDtoToWorkspace),
    [workspaces],
  );

  const activeWorkspace = useMemo(() => {
    const dto = workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0];
    return dto ? workspaceDtoToWorkspace(dto) : null;
  }, [workspaces, activeWorkspaceId]);

  const loadTeam = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!activeWorkspaceId) {
        return;
      }
      if (!opts?.silent) {
        setTeamLoading(true);
      }
      try {
        const data = await fetchTeamMembers(activeWorkspaceId);
        setTeamMembers(data);
      } catch {
        setTeamMembers([]);
      } finally {
        if (!opts?.silent) {
          setTeamLoading(false);
        }
      }
    },
    [activeWorkspaceId],
  );

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  useEffect(() => {
    const id = window.setInterval(() => void loadTeam({ silent: true }), 30_000);
    return () => window.clearInterval(id);
  }, [loadTeam]);

  const onSelectWorkspace = useCallback(
    async (ws: Workspace) => {
      if (ws.id === activeWorkspaceId) {
        return;
      }
      try {
        const res = await fetch("/api/workspaces/switch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: ws.id }),
        });
        if (!res.ok) {
          toast.error("Could not switch workspace");
          return;
        }
        router.refresh();
      } catch {
        toast.error("Could not switch workspace");
      }
    },
    [activeWorkspaceId, router],
  );

  const onInvite = useCallback(() => {
    router.push(`/workspaces/${activeWorkspaceId}/invite`);
  }, [activeWorkspaceId, router]);

  const onSettings = useCallback(() => {
    router.push("/settings/workspace");
  }, [router]);

  const onDropdownOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        void loadTeam({ silent: true });
      }
    },
    [loadTeam],
  );

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  const basePanelProps: Omit<
    AppSidebarPanelProps,
    "collapsed" | "onToggleCollapse"
  > = {
    userEmail,
    userName,
    userRole,
    activeWorkspaceId,
    activeWorkspace,
    workspaceList,
    workspaces,
    teamMembers,
    teamLoading,
    reviewQueueCount,
    pathname,
    onSelectWorkspace,
    onInvite,
    onSettings,
    onOpenChange: onDropdownOpenChange,
    onNavigate: closeMobileMenu,
  };

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-sidebar-edge transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[var(--cv-sidebar-collapsed-width)]" : "w-[var(--cv-sidebar-width)]",
        )}
      >
        <AppSidebarPanel
          {...basePanelProps}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      <div className="fixed left-0 top-0 z-50 lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-none text-text-primary">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[var(--cv-sidebar-width)] border-sidebar-edge bg-sidebar-bg p-0">
            <AppSidebarPanel {...basePanelProps} collapsed={false} />
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
