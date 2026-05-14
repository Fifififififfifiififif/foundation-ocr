import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getAppContext } from "@/lib/app-context";
import { roleHasPermission } from "@/lib/permissions";
import { documentStatusPl, organizationRolePl } from "@/lib/ui-i18n";
import type { SearchResultGroup } from "@/lib/search-types";

const take = 8;

export async function GET(req: NextRequest) {
  const { organizationId: orgId, user } = await getAppContext();
  const canListUsers = roleHasPermission(user.role, "settings.users");

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ q, groups: [] satisfies SearchResultGroup[] });
  }

  const mode = { contains: q, mode: "insensitive" as const };

  const [documents, contractors, projects, users] = await Promise.all([
    prisma.document.findMany({
      where: {
        organizationId: orgId,
        archived: false,
        OR: [
          { invoiceNumber: mode },
          { fileName: mode },
          { ocrVendorName: mode },
          ...(q.length >= 4 ? [{ ocrRawText: mode }] : []),
        ],
      },
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        invoiceNumber: true,
        fileName: true,
        status: true,
      },
    }),
    prisma.contractor.findMany({
      where: { organizationId: orgId, name: mode },
      take,
      orderBy: { name: "asc" },
      select: { id: true, name: true, nip: true },
    }),
    prisma.project.findMany({
      where: {
        organizationId: orgId,
        OR: [{ name: mode }, { grantNumber: mode }, { fundingSource: mode }],
      },
      take,
      orderBy: { name: "asc" },
      select: { id: true, name: true, grantNumber: true },
    }),
    canListUsers
      ? prisma.user.findMany({
          where: {
            organizationId: orgId,
            OR: [{ name: mode }, { email: mode }],
          },
          take: 6,
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, role: true },
        })
      : Promise.resolve([]),
  ]);

  const groups: SearchResultGroup[] = [];

  if (documents.length) {
    groups.push({
      id: "documents",
      title: "Faktury",
      items: documents.map((d) => ({
        id: d.id,
        title: d.invoiceNumber?.trim() || d.fileName,
        subtitle: documentStatusPl(d.status),
        href: `/documents/${d.id}`,
      })),
    });
  }

  if (contractors.length) {
    groups.push({
      id: "contractors",
      title: "Kontrahenci",
      items: contractors.map((c) => ({
        id: c.id,
        title: c.name,
        subtitle: c.nip ? `NIP ${c.nip}` : null,
        href: `/contractors/${c.id}`,
      })),
    });
  }

  if (projects.length) {
    groups.push({
      id: "projects",
      title: "Projekty",
      items: projects.map((p) => ({
        id: p.id,
        title: p.name,
        subtitle: p.grantNumber,
        href: `/projects/${p.id}`,
      })),
    });
  }

  if (users.length) {
    groups.push({
      id: "users",
      title: "Użytkownicy",
      items: users.map((u) => ({
        id: u.id,
        title: u.name,
        subtitle: `${u.email} · ${organizationRolePl(u.role)}`,
        href: "/ustawienia/uzytkownicy",
      })),
    });
  }

  return NextResponse.json({ q, groups });
}
