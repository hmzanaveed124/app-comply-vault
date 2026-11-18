"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { Settings, Bell, LogOut } from "lucide-react";
import { Avatar, Dropdown } from "antd";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useNotifications } from "~/hooks/use-notifications";

interface UserMenuProps {
  userEmail?: string | null;
  userName?: string | null;
  userImage?: string | null;
  userRole?: string | null;
  billingStatus?: string | null;
}

export function UserMenu({
  userEmail,
  userName,
  userImage,
  userRole,
  billingStatus,
}: UserMenuProps) {
  const { notificationCount } = useNotifications();

  const getInitials = () => {
    if (userName) {
      return userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (userEmail) {
      return userEmail[0]?.toUpperCase() ?? "U";
    }
    return "U";
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/settings">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Link>
      </Button>

      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{
          items: [
            {
              key: "profile",
              disabled: true,
              label: (
                <div className="flex flex-col gap-1 py-2">
                  <p className="font-medium text-text-primary">
                    {userName || "User"}
                  </p>
                  <p className="text-xs text-text-secondary">{userEmail}</p>
                  {userRole && (
                    <Badge variant="outline">
                      {userRole === "OWNER_CCO" ? "Owner/CCO" : "Member"}
                    </Badge>
                  )}
                  {billingStatus === "TRIALING" && (
                    <Badge variant="secondary">Free Trial</Badge>
                  )}
                </div>
              ),
            },
            { type: "divider" },
            {
              key: "notifications",
              icon: <Bell size={16} />,
              label: (
                <Link href="/notifications">
                  Notifications{" "}
                  {notificationCount > 0 && (
                    <Badge variant="destructive">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Badge>
                  )}
                </Link>
              ),
            },
            {
              key: "settings",
              icon: <Settings size={16} />,
              label: <Link href="/settings">Settings</Link>,
            },
            { type: "divider" },
            {
              key: "sign-out",
              danger: true,
              icon: <LogOut size={16} />,
              label: "Sign Out",
              onClick: () => signOut({ callbackUrl: "/" }),
            },
          ],
        }}
      >
        <Button
          variant="ghost"
          className="h-9 w-9 rounded-full p-0"
          aria-label="Open user menu"
        >
          <Avatar
            size={36}
            src={userImage ?? undefined}
            alt={userName ?? userEmail ?? "User"}
          >
            {getInitials()}
          </Avatar>
        </Button>
      </Dropdown>
    </div>
  );
}
