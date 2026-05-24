"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  Globe,
  Landmark,
  Palette,
  Plug,
  ScanLine,
  Shield,
  User,
  CreditCard,
} from "lucide-react";

import { breadcrumbSegmentPl } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/ustawienia/konto", label: breadcrumbSegmentPl.konto, icon: User },
  { href: "/ustawienia/subskrypcja", label: "Subskrypcja", icon: CreditCard },
  { href: "/ustawienia/moduly", label: breadcrumbSegmentPl.moduly, icon: Plug },
  { href: "/ustawienia/ogolne", label: breadcrumbSegmentPl.ogolne, icon: Globe },
  { href: "/ustawienia/wyglad", label: breadcrumbSegmentPl.wyglad, icon: Palette },
  { href: "/ustawienia/organizacja", label: breadcrumbSegmentPl.organizacja, icon: Building2 },
  { href: "/ustawienia/finanse", label: "Finanse", icon: Landmark },
  { href: "/ustawienia/powiadomienia", label: breadcrumbSegmentPl.powiadomienia, icon: Bell },
  { href: "/ustawienia/bezpieczenstwo", label: breadcrumbSegmentPl.bezpieczenstwo, icon: Shield },
  { href: "/ustawienia/integracje", label: breadcrumbSegmentPl.integracje, icon: Plug },
  { href: "/ustawienia/ocr", label: breadcrumbSegmentPl.ocr, icon: ScanLine },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Ustawienia — nawigacja"
      className="bg-card/80 flex flex-wrap gap-1 rounded-xl border border-border/80 p-1 shadow-sm backdrop-blur-sm lg:sticky lg:top-20 lg:flex lg:w-52 lg:flex-col lg:flex-nowrap"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-muted text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "opacity-70")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
