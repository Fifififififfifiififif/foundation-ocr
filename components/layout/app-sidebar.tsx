"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  ScanLine,
  Settings,
  Users,
} from "lucide-react";

import { a11yFoundationLogo, breadcrumbSegmentPl } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { accentFirstStopHex } from "@/lib/accent-color";

const links = [
  { href: "/dashboard", label: breadcrumbSegmentPl.dashboard, icon: LayoutDashboard },
  { href: "/documents", label: breadcrumbSegmentPl.documents, icon: FileText },
  { href: "/kalendarz", label: breadcrumbSegmentPl.kalendarz, icon: CalendarDays },
  { href: "/contractors", label: breadcrumbSegmentPl.contractors, icon: Building2 },
  { href: "/projects", label: breadcrumbSegmentPl.projects, icon: FolderKanban },
  { href: "/ocr", label: breadcrumbSegmentPl.ocr, icon: ScanLine },
  { href: "/raporty", label: breadcrumbSegmentPl.raporty, icon: BarChart3 },
  { href: "/ustawienia", label: breadcrumbSegmentPl.ustawienia, icon: Settings },
  { href: "/ustawienia/uzytkownicy", label: "Użytkownicy", icon: Users, adminOnly: true as const },
] as const;

export type SidebarBranding = {
  foundationName: string;
  tagline: string | null;
  logoUrl: string | null;
  accentColor: string;
};

export type SidebarVariant = "default" | "soft" | "minimal";

interface AppSidebarProps {
  branding: SidebarBranding;
  sidebarVariant?: SidebarVariant;
  canManageUsers?: boolean;
}

export function AppSidebar({ branding, sidebarVariant = "default", canManageUsers }: AppSidebarProps) {
  const pathname = usePathname();
  const accentHex = accentFirstStopHex(branding.accentColor);

  return (
    <aside
      className={cn(
        "bg-sidebar text-sidebar-foreground flex h-full w-60 shrink-0 flex-col",
        sidebarVariant === "default" && "border-r border-sidebar-border",
        sidebarVariant === "soft" && "m-2 mr-0 rounded-xl border border-sidebar-border bg-sidebar/95 shadow-sm",
        sidebarVariant === "minimal" && "border-r border-transparent bg-sidebar/80",
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-3">
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo z `/api/branding/logo`; brak stabilnych wymiarów źródła
            <img
              src={branding.logoUrl}
              alt={a11yFoundationLogo}
              className="border-sidebar-border size-9 shrink-0 rounded-lg border bg-background object-contain p-0.5"
            />
          ) : (
            <div
              className="border-sidebar-border bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg border"
              style={{ borderColor: accentHex }}
            >
              <Landmark className="size-5 opacity-80" style={{ color: accentHex }} />
            </div>
          )}
          <div className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-semibold tracking-tight">{branding.foundationName}</span>
            <span className="text-muted-foreground block truncate text-[10px] font-medium uppercase">
              {branding.tagline?.trim() || "Rejestr dokumentów"}
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {links
          .filter((l) => !("adminOnly" in l && l.adminOnly) || canManageUsers)
          .map(({ href, label, icon: Icon }) => {
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
