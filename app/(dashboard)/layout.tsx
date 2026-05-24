import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";
import { DashboardBreadcrumbs } from "@/components/layout/dashboard-breadcrumbs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getAppContext } from "@/lib/app-context";
import { redirect } from "next/navigation";
import { brandingLogoUrl } from "@/lib/branding-url";
import { getOrganizationById } from "@/lib/organization-settings";
import { entitlementToSummary } from "@/src/modules/subscription/display";
import { fetchNotificationBundleForUser } from "@/lib/in-app-notifications";
import { cn } from "@/lib/utils";
import { listUserOrganizations } from "@/src/modules/organizations/context";
import { filterNavLinks } from "@/src/modules/permissions/navigation";
import { roleHasPermission } from "@/lib/permissions";
import { canManageUsers } from "@/src/modules/permissions/hierarchy";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();
  const { organizationId: orgId, user, enabledModules } = ctx;

  if (user.banned) {
    redirect("/odmowa-dostepu?reason=banned");
  }

  const [s, notificationBundle] = await Promise.all([
    getOrganizationById(orgId),
    fetchNotificationBundleForUser(user.id, orgId),
  ]);

  let memberships = await listUserOrganizations(user.id).catch(() => []);
  if (memberships.length === 0) {
    memberships = [
      {
        organizationId: orgId,
        userId: user.id,
        role: user.role ?? "MEMBER",
        isActive: true,
        id: `om_${user.id}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        organization: {
          id: orgId,
          name: s.name,
          slug: s.slug,
          logoPath: s.logoPath,
          accentColor: s.accentColor,
        },
      },
    ];
  }

  const branding = {
    organizationName: s.name,
    tagline: s.tagline,
    logoUrl: brandingLogoUrl(s.logoPath),
    accentColor: s.accentColor,
  };

  const canManageUsersFlag =
    user.isSuperAdmin || canManageUsers(user.role) || roleHasPermission(user.role, "settings.users");

  const subscription = entitlementToSummary(ctx.entitlement);

  const navLinks = filterNavLinks(enabledModules, {
    canManageUsers: canManageUsersFlag,
    isSuperAdmin: user.isSuperAdmin,
  });

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
        links={navLinks}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-2 md:pt-3">
        <DashboardTopbar
          user={user}
          branding={branding}
          organizations={memberships.map((m) => ({
            id: m.organization.id,
            name: m.organization.name,
            slug: m.organization.slug,
          }))}
          activeOrganizationId={orgId}
          notificationItems={notificationBundle.items}
          unreadNotificationCount={notificationBundle.unreadCount}
          canManageUsers={canManageUsersFlag}
          subscription={subscription}
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
