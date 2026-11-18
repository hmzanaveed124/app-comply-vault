"use client";

import { ThemeToggle } from "~/theme/provider";
import { GlobalSearch } from "~/components/global-search";
import { UserMenu } from "~/components/user-menu";
import { NotificationBellButton } from "~/components/notification-bell-button";
import { NotificationsProvider } from "~/components/notifications-provider";

interface TopBarProps {
  userEmail?: string | null;
  userName?: string | null;
  userImage?: string | null;
  userRole?: string | null;
  billingStatus?: string | null;
}

export function TopBar({
  userEmail,
  userName,
  userImage,
  userRole,
  billingStatus,
}: TopBarProps) {
  return (
    <NotificationsProvider>
      <div className="sticky top-0 z-40 h-[var(--cv-header-height)] w-full border-b border-surface-border bg-surface-card/95 backdrop-blur supports-[backdrop-filter]:bg-surface-card/80">
        <div className="flex h-[var(--cv-header-height)] items-center gap-3 px-4 sm:px-6 lg:px-6">
          <div className="min-w-0 flex-1 pl-14 lg:pl-0">
            <GlobalSearch />
          </div>
          <ThemeToggle />
          <NotificationBellButton />
          <div className="flex shrink-0">
            <UserMenu
              userEmail={userEmail}
              userName={userName}
              userImage={userImage}
              userRole={userRole}
              billingStatus={billingStatus}
            />
          </div>
        </div>
      </div>
    </NotificationsProvider>
  );
}
