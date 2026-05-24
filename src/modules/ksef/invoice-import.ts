import prisma from "@/lib/prisma";
import { encryptSecret } from "@/lib/secrets";
import {
  authenticateKsefToken,
  fetchKsefInvoiceByReference,
  queryKsefInvoices,
} from "@/src/modules/ksef/client";
import {
  classificationForKsefDirection,
  mapKsefMetadataToInvoice,
  mapKsefStatus,
  parseKsefInvoiceXml,
} from "@/src/modules/ksef/mapper";
import { loadKsefSession } from "@/src/modules/ksef/session";
import type { KsefConnectionTestResult, KsefImportResult, KsefInvoiceDirection } from "@/src/modules/ksef/types";
import { normalizeKsefNip } from "@/src/modules/ksef/validation";
import { writeAuditLog } from "@/src/modules/tenant/audit";

export async function connectKsefIntegration(input: {
  organizationId: string;
  userId: string;
  environment: "test" | "prod";
  nip: string;
  token: string;
}): Promise<KsefConnectionTestResult> {
  const nip = normalizeKsefNip(input.nip);
  const auth = await authenticateKsefToken({
    environment: input.environment,
    nip,
    token: input.token,
  });

  if (!auth.ok) {
    await prisma.ksefIntegration.upsert({
      where: { organizationId: input.organizationId },
      create: {
        organizationId: input.organizationId,
        environment: input.environment,
        nip,
        status: "error",
        tokenEncrypted: encryptSecret(input.token),
        lastError: auth.message,
      },
      update: {
        environment: input.environment,
        nip,
        status: "error",
        tokenEncrypted: encryptSecret(input.token),
        lastError: auth.message,
      },
    });
    return { ok: false, message: auth.message, environment: input.environment };
  }

  await prisma.ksefIntegration.upsert({
    where: { organizationId: input.organizationId },
    create: {
      organizationId: input.organizationId,
      environment: input.environment,
      nip,
      status: "connected",
      tokenEncrypted: encryptSecret(input.token),
      authMetadata: {
        accessToken: auth.session.accessToken,
        refreshToken: auth.session.refreshToken,
        expiresAt: auth.session.expiresAt.toISOString(),
        sessionReference: auth.session.sessionReference,
      },
      lastSyncMessage: "Połączono z KSeF.",
      lastError: null,
    },
    update: {
      environment: input.environment,
      nip,
      status: "connected",
      tokenEncrypted: encryptSecret(input.token),
      authMetadata: {
        accessToken: auth.session.accessToken,
        refreshToken: auth.session.refreshToken,
        expiresAt: auth.session.expiresAt.toISOString(),
        sessionReference: auth.session.sessionReference,
      },
      lastSyncMessage: "Połączono z KSeF.",
      lastError: null,
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "ksef.connected",
    metadata: { environment: input.environment, nip },
  });

  return { ok: true, message: "Połączenie z KSeF działa.", environment: input.environment };
}

export async function testKsefConnection(organizationId: string): Promise<KsefConnectionTestResult> {
  const sessionCtx = await loadKsefSession(organizationId);
  if (!sessionCtx) {
    const row = await prisma.ksefIntegration.findUnique({ where: { organizationId } });
    return {
      ok: false,
      message: "Brak aktywnej sesji KSeF. Połącz ponownie.",
      environment: row?.environment ?? "test",
    };
  }
  return {
    ok: true,
    message: "Sesja KSeF aktywna.",
    environment: sessionCtx.environment,
  };
}

export async function importKsefInvoices(input: {
  organizationId: string;
  userId: string;
  direction: KsefInvoiceDirection;
  dateFrom?: string;
  dateTo?: string;
  ksefReference?: string;
  limit?: number;
}): Promise<KsefImportResult> {
  const sessionCtx = await loadKsefSession(input.organizationId);
  if (!sessionCtx) {
    return { imported: 0, skipped: 0, errors: ["Brak aktywnej sesji KSeF."] };
  }

  const classification = classificationForKsefDirection(input.direction);
  const errors: string[] = [];
  let imported = 0;
  let skipped = 0;

  let items: NonNullable<ReturnType<typeof mapKsefMetadataToInvoice>>[] = [];

  if (input.ksefReference) {
    const detail = await fetchKsefInvoiceByReference({
      environment: sessionCtx.environment,
      accessToken: sessionCtx.session.accessToken,
      ksefReference: input.ksefReference,
    });
    if (!detail.ok) {
      return { imported: 0, skipped: 0, errors: [detail.message] };
    }
    const parsed = parseKsefInvoiceXml(detail.xml);
    const mapped = mapKsefMetadataToInvoice(
      { ksefReference: input.ksefReference, ...parsed },
      input.direction,
    );
    if (mapped) items = [{ ...mapped, rawXml: detail.xml }];
  } else {
    const listed = await queryKsefInvoices({
      environment: sessionCtx.environment,
      accessToken: sessionCtx.session.accessToken,
      nip: sessionCtx.nip,
      direction: input.direction,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      pageSize: input.limit ?? 50,
    });
    if (!listed.ok) return { imported: 0, skipped: 0, errors: [listed.message] };
    items = listed.items
      .map((row) => mapKsefMetadataToInvoice(row, input.direction))
      .filter(Boolean) as NonNullable<ReturnType<typeof mapKsefMetadataToInvoice>>[];
  }

  for (const item of items) {
    const exists = await prisma.document.findFirst({
      where: { organizationId: input.organizationId, ksefReference: item.ksefReference },
      select: { id: true },
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    try {
      await prisma.document.create({
        data: {
          organizationId: input.organizationId,
          source: "ksef",
          status: "approved",
          classification,
          invoiceNumber: item.invoiceNumber,
          issueDate: item.issueDate ? new Date(item.issueDate) : null,
          sellerName: item.sellerName,
          sellerNip: item.sellerNip,
          buyerName: item.buyerName,
          buyerNip: item.buyerNip,
          amountNet: item.amountNet,
          amountVat: item.amountVat,
          amountGross: item.amountGross,
          currency: "PLN",
          ksefReference: item.ksefReference,
          ksefStatus: mapKsefStatus(item.status),
          ksefRawXml: item.rawXml ?? null,
          createdByUserId: input.userId,
        },
      });
      imported += 1;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Błąd zapisu faktury.");
    }
  }

  await prisma.ksefIntegration.update({
    where: { organizationId: input.organizationId },
    data: {
      lastSyncAt: new Date(),
      lastSyncMessage: `Zaimportowano ${imported}, pominięto ${skipped}.`,
      lastError: errors[0] ?? null,
    },
  });

  await writeAuditLog({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "ksef.import",
    metadata: { direction: input.direction, imported, skipped },
  });

  return { imported, skipped, errors };
}
