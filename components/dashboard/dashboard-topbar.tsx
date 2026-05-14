"use client";

import { GlobalSearchCommand } from "@/components/dashboard/global-search-command";
import Link from "next/link";

import { NotificationInbox } from "@/components/dashboard/notification-inbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NotificationItemDTO } from "@/lib/in-app-notifications";
import { SignOutMenuItem } from "@/components/auth/sign-out-menu-item";
import { organizationRolePl } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";

type Props = {
  user: { name: string; email: string; role?: string | null };
  branding: { foundationName: string; tagline: string | null };
  notificationItems: NotificationItemDTO[];
  unreadNotificationCount: number;
  canManageUsers?: boolean;
};

export function DashboardTopbar({
  user,
  branding,
  notificationItems,
  unreadNotificationCount,
  canManageUsers,
}: Props) {
  return (
    <header className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-6">
      <GlobalSearchCommand />
      <div className="hidden min-w-0 flex-1 text-center md:block">
        <p className="truncate text-xs font-semibold">{branding.foundationName}</p>
        {branding.tagline?.trim() ? (
          <p className="truncate text-[10px] text-sidebar-foreground/70">{branding.tagline}</p>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <NotificationInbox
          initialItems={notificationItems}
          initialUnreadCount={unreadNotificationCount}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "max-w-[200px] truncate border-sidebar-border bg-sidebar text-sidebar-foreground shadow-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "dark:border-sidebar-border dark:bg-sidebar dark:hover:bg-sidebar-accent dark:hover:text-sidebar-accent-foreground",
              )}
            >
              {user.name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                <span className="text-muted-foreground text-[10px] uppercase">
                  Rola: {organizationRolePl(user.role)}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ustawienia">Ustawienia</Link>
            </DropdownMenuItem>
            {canManageUsers ? (
              <DropdownMenuItem asChild>
                <Link href="/ustawienia/uzytkownicy">Użytkownicy</Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/raporty">Raporty</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
