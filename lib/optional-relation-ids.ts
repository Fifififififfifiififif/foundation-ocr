import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma";

/** Etykieta w tabelach i podsumowaniach, gdy brak powiązania z projektem lub kontrahentem. */
export const UNASSIGNED_LABEL = "Nie przypisano";

export function parseOptionalCuid(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return z.string().cuid().safeParse(t).success ? t : null;
}

/**
 * Gdy użytkownik nie wybierze kontrahenta: dopasowanie tylko przy wysokiej pewności
 * (dokładny NIP lub dokładna nazwa bez rozróżniania wielkości liter).
 */
export async function suggestContractorIdFromOcr(
  db: PrismaClient,
  opts: {
    organizationId: string;
    explicitId: string | null;
    nip: string | null;
    vendorName: string | null;
  },
): Promise<string | null> {
  if (opts.explicitId) {
    const ok = await db.contractor.findUnique({
      where: { id: opts.explicitId },
      select: { id: true, organizationId: true },
    });
    if (ok && ok.organizationId === opts.organizationId) return ok.id;
    return null;
  }
  const orgWhere = { organizationId: opts.organizationId };
  const nipClean = opts.nip?.replace(/\D/g, "") ?? "";
  if (nipClean.length === 10) {
    const byNip = await db.contractor.findFirst({
      where: { ...orgWhere, nip: nipClean },
      select: { id: true },
    });
    if (byNip) return byNip.id;
  }
  const name = opts.vendorName?.trim();
  if (name && name.length >= 3) {
    const exact = await db.contractor.findFirst({
      where: { ...orgWhere, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (exact) return exact.id;
  }
  return null;
}

export function normalizeDocumentJsonIds(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (o.contractorId === null || o.contractorId === undefined) o.contractorId = "";
  if (o.projectId === null || o.projectId === undefined) o.projectId = "";
  return o;
}
