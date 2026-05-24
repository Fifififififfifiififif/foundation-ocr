"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { maskSecret } from "@/lib/secrets";
import { requireModule, requirePermission } from "@/lib/require-permission";
import {
  connectKsefIntegration,
  importKsefInvoices,
  testKsefConnection,
} from "@/src/modules/ksef/invoice-import";
import { ksefConnectSchema, ksefImportSchema } from "@/src/modules/ksef/validation";
import type { KsefConnectionTestResult, KsefImportResult } from "@/src/modules/ksef/types";

export type KsefActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string };

export type KsefIntegrationView = {
  environment: "test" | "prod";
  status: string;
  nip: string | null;
  tokenMasked: string;
  lastSyncAt: string | null;
  lastSyncMessage: string | null;
  lastError: string | null;
};

function touchKsefPaths() {
  revalidatePath("/ustawienia/integracje");
  revalidatePath("/dashboard");
  revalidatePath("/documents");
}

export async function getKsefIntegrationAction(): Promise<KsefIntegrationView | null> {
  const { organizationId } = await requireModule("ACCOUNTING");
  await requirePermission("integrations.manage");

  const row = await prisma.ksefIntegration.findUnique({ where: { organizationId } });
  if (!row) return null;

  return {
    environment: row.environment,
    status: row.status,
    nip: row.nip,
    tokenMasked: row.tokenEncrypted ? maskSecret("********") : "—",
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    lastSyncMessage: row.lastSyncMessage,
    lastError: row.lastError,
  };
}

export async function connectKsefAction(input: unknown): Promise<KsefActionResult<KsefConnectionTestResult>> {
  const { organizationId, user } = await requireModule("ACCOUNTING");
  await requirePermission("integrations.manage");

  const parsed = ksefConnectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji." };
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { nip: true },
  });
  const nip = parsed.data.nip?.trim()
    ? parsed.data.nip.replace(/\D/g, "").slice(-10)
    : org?.nip?.replace(/\D/g, "").slice(-10);

  if (!nip || nip.length !== 10) {
    return { ok: false, error: "Uzupełnij NIP organizacji w profilu lub w formularzu KSeF." };
  }

  const result = await connectKsefIntegration({
    organizationId,
    userId: user.id,
    environment: parsed.data.environment,
    nip,
    token: parsed.data.token,
  });

  touchKsefPaths();
  if (!result.ok) return { ok: false, error: result.message };
  return { ok: true, message: result.message, data: result };
}

export async function testKsefConnectionAction(): Promise<KsefActionResult<KsefConnectionTestResult>> {
  const { organizationId } = await requireModule("ACCOUNTING");
  await requirePermission("integrations.manage");

  const result = await testKsefConnection(organizationId);
  if (!result.ok) return { ok: false, error: result.message };
  return { ok: true, message: result.message, data: result };
}

export async function importKsefInvoicesAction(input: unknown): Promise<KsefActionResult<KsefImportResult>> {
  const { organizationId, user } = await requireModule("ACCOUNTING");
  await requirePermission("integrations.manage");

  const parsed = ksefImportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Błąd walidacji." };
  }

  const result = await importKsefInvoices({
    organizationId,
    userId: user.id,
    direction: parsed.data.direction,
    dateFrom: parsed.data.dateFrom,
    dateTo: parsed.data.dateTo,
    ksefReference: parsed.data.ksefReference,
    limit: parsed.data.limit,
  });

  touchKsefPaths();
  const msg = `Zaimportowano ${result.imported}, pominięto ${result.skipped}.`;
  if (result.errors.length > 0 && result.imported === 0) {
    return { ok: false, error: result.errors.join(" ") };
  }
  return { ok: true, message: msg, data: result };
}
