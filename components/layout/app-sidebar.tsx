"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  LayoutDashboard,
  ScanLine,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { a11yOrganizationLogo, appTaglineDefault } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { accentFirstStopHex } from "@/lib/accent-color";
import type { NavLink } from "@/src/modules/permissions/navigation";

const ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/documents": FileText,
  "/kalendarz": CalendarDays,
  "/contractors": Building2,
  "/projects": FolderKanban,
  "/ocr": ScanLine,
  "/raporty": BarChart3,
  "/ustawienia": Settings,
  "/ustawienia/uzytkownicy": Users,
  "/admin": Shield,
};

export type SidebarBranding = {
  organizationName: string;
  tagline: string | null;
  logoUrl: string | null;
  accentColor: string;
};

export type SidebarVariant = "default" | "soft" | "minimal";

interface AppSidebarProps {
  branding: SidebarBranding;
  sidebarVariant?: SidebarVariant;
  links: NavLink[];
}

export function AppSidebar({ branding, sidebarVariant = "default", links }: AppSidebarProps) {
  const pathname = usePathname();
  const accentHex = accentFirstStopHex(branding.accentColor);

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-full w-60 shrink-0 flex-col",
        sidebarVariant === "default" && "border-r border-sidebar-border pt-2 md:pt-3",
        sidebarVariant === "soft" &&
          "m-2 mr-0 mt-2.5 rounded-xl border border-sidebar-border bg-sidebar/95 shadow-sm md:mt-3",
        sidebarVariant === "minimal" && "border-r border-transparent bg-sidebar/80 pt-2 md:pt-3",
      )}
    >
      <div className="flex min-h-[3.75rem] items-center border-b border-sidebar-border px-4 py-2.5">
        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={a11yOrganizationLogo}
              className="border-sidebar-border size-9 shrink-0 rounded-lg border bg-background object-contain p-0.5"
            />
          ) : (
            <div
              className="border-sidebar-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg border"
              style={{ borderColor: accentHex }}
            >
              <Building2 className="size-5 opacity-80" style={{ color: accentHex }} />
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold tracking-tight">
              {branding.organizationName}
            </span>
            <span className="text-muted-foreground block truncate text-[10px] font-medium uppercase">
              {branding.tagline?.trim() || appTaglineDefault}
            </span>
          </div>
        </Link>
      </div>

      <nav className="sidebar-nav-scroll flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {links.map(({ href, label }) => {
          const Icon = ICONS[href] ?? FileText;
          const active =
            pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm ring-1 ring-sidebar-border/60"
                  : "text-sidebar-foreground/90 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 opacity-80" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
