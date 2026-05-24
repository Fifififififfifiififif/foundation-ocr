"use client";

import { GlobalSearchCommand } from "@/components/dashboard/global-search-command";
import Link from "next/link";

import { NotificationInbox } from "@/components/dashboard/notification-inbox";
import { OrganizationSwitcher, type OrgOption } from "@/components/layout/organization-switcher";
import { SupportMenu } from "@/components/navbar/support-menu";
import { SubscriptionStatus } from "@/components/navbar/subscription-status";
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
import type { SubscriptionSummary } from "@/lib/subscription-display";
import { organizationRolePl } from "@/lib/ui-i18n";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";

type Props = {
  user: { name: string; email: string; role?: string | null; isSuperAdmin?: boolean };
  branding: { organizationName: string; tagline: string | null };
  organizations: OrgOption[];
  activeOrganizationId: string;
  notificationItems: NotificationItemDTO[];
  unreadNotificationCount: number;
  canManageUsers?: boolean;
  subscription: SubscriptionSummary;
};

export function DashboardTopbar({
  user,
  branding,
  organizations,
  activeOrganizationId,
  notificationItems,
  unreadNotificationCount,
  canManageUsers,
  subscription,
}: Props) {
  return (
    <header className="bg-sidebar text-sidebar-foreground border-sidebar-border sticky top-0 z-10 flex min-h-[3.75rem] shrink-0 items-center gap-3 border-b px-4 py-2.5 md:px-6 md:py-3">
      <GlobalSearchCommand />
      <div className="hidden min-w-0 flex-1 text-center md:block">
        <p className="truncate text-xs font-semibold">{branding.organizationName}</p>
        {branding.tagline?.trim() ? (
          <p className="truncate text-[10px] text-sidebar-foreground/70">{branding.tagline}</p>
        ) : null}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2">
        <OrganizationSwitcher
          organizations={organizations}
          activeOrganizationId={activeOrganizationId}
        />
        <SupportMenu />
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
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                <span className="text-muted-foreground text-[10px] uppercase">
                  Rola: {organizationRolePl(user.role)}
                  {user.isSuperAdmin ? " · Super Admin" : ""}
                </span>
                <p className="text-muted-foreground truncate text-[11px] normal-case">
                  {branding.organizationName}
                </p>
                <SubscriptionStatus subscription={subscription} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/ustawienia">Ustawienia</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/ustawienia/subskrypcja">Subskrypcja i plan</Link>
            </DropdownMenuItem>
            {canManageUsers ? (
              <DropdownMenuItem asChild>
                <Link href="/ustawienia/uzytkownicy">Użytkownicy</Link>
              </DropdownMenuItem>
            ) : null}
            {user.isSuperAdmin ? (
              <DropdownMenuItem asChild>
                <Link href="/admin">Panel platformy</Link>
              </DropdownMenuItem>
            ) : null}
            {["pro", "enterprise"].includes(subscription.effectivePlan) ? (
              <DropdownMenuItem asChild>
                <Link href="/raporty">Raporty</Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <form action={signOutAction}>
              <DropdownMenuItem asChild>
                <button
                  type="submit"
                  className="w-full cursor-pointer text-left"
                >
                  Wyloguj
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
