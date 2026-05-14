"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { breadcrumbHomeLabel, breadcrumbSegmentLabel } from "@/lib/i18n/navigation";

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const raw = pathname.replace(/^\//, "").split("/").filter(Boolean);
  if (raw.length === 0 || (raw.length === 1 && raw[0] === "dashboard")) {
    return null;
  }

  const crumbs: { href: string; label: string; isLast: boolean }[] = [];
  let acc = "";
  raw.forEach((seg, i) => {
    acc += `/${seg}`;
    const isLast = i === raw.length - 1;
    crumbs.push({
      href: acc,
      label: breadcrumbSegmentLabel(i, seg, raw),
      isLast,
    });
  });

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard" className="inline-flex items-center gap-1">
            <Home className="size-3.5" />
            {breadcrumbHomeLabel}
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((c) => (
          <Fragment key={c.href}>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3.5 opacity-60" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {c.isLast ? (
                <BreadcrumbPage className="font-medium">{c.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
