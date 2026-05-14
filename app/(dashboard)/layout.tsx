import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { DashboardBreadcrumbs } from "@/components/layout/dashboard-breadcrumbs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getAppContext } from "@/lib/app-context";
import { brandingLogoUrl } from "@/lib/branding-url";
import { getOrganizationById } from "@/lib/organization-settings";
import { fetchNotificationBundleForUser } from "@/lib/in-app-notifications";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { organizationId: orgId, user } = await getAppContext();
  const s = await getOrganizationById(orgId);
  const notificationBundle = await fetchNotificationBundleForUser(user.id, orgId);
  const branding = {
    foundationName: s.name,
    tagline: s.tagline,
    logoUrl: brandingLogoUrl(s.logoPath),
    accentColor: s.accentColor,
  };

  const canManageUsers = user.role === "ADMIN";

  return (
    <div
      data-sidebar-variant={s.sidebarStyle}
      data-ui-density={s.uiDensity}
      className={cn(
        "bg-background text-foreground flex h-screen overflow-hidden",
        s.uiDensity === "compact" && "density-compact",
      )}
    >
      <AppSidebar
        branding={branding}
        sidebarVariant={s.sidebarStyle as "default" | "soft" | "minimal"}
        canManageUsers={canManageUsers}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <DashboardTopbar
          user={user}
          branding={branding}
          notificationItems={notificationBundle.items}
          unreadNotificationCount={notificationBundle.unreadCount}
          canManageUsers={canManageUsers}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent dark:bg-muted/20">
          <div
            className={cn(
              "mx-auto max-w-7xl px-4 md:px-8",
              s.uiDensity === "compact" ? "py-4 md:py-5" : "py-6 md:py-8",
            )}
          >
            <DashboardBreadcrumbs />
            {children}
          </div>
        </main>
      </div>
      <Toaster />
    </div>
  );
}
