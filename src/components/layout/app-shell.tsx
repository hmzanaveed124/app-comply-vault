"use client";

import { cn } from "~/lib/utils";
import { SidebarProvider, useSidebar } from "~/components/layout/sidebar-context";

type AppShellProps = {
  sidebar: React.ReactNode;
  topBar: React.ReactNode;
  children: React.ReactNode;
};

function AppShellInner({
  sidebar,
  topBar,
  children,
}: AppShellProps): React.JSX.Element {
  const { collapsed } = useSidebar();
  // Both literal classes are present so Tailwind can statically detect them.
  const pad = collapsed ? "lg:pl-[var(--cv-sidebar-collapsed-width)]" : "lg:pl-[var(--cv-sidebar-width)]";

  return (
    <>
      {sidebar}
      <div className={cn("transition-[padding] duration-200 ease-out", pad)}>
        {topBar}
      </div>
      <main
        className={cn(
          "min-h-screen pt-[var(--cv-header-height)] transition-[padding] duration-200 ease-out",
          pad,
        )}
      >
        {children}
      </main>
    </>
  );
}

export function AppShell(props: AppShellProps): React.JSX.Element {
  return (
    <SidebarProvider>
      <AppShellInner {...props} />
    </SidebarProvider>
  );
}
