import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getAppContext } from "@/lib/app-context";
import { documentStatusPl } from "@/lib/ui-i18n";
import { roleHasPermission } from "@/lib/permissions";

function csvEscape(s: string | null | undefined): string {
  if (s == null) return "";
  const t = String(s);
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

export async function POST(req: Request) {
  const { organizationId: orgId, user } = await getAppContext();
  if (!roleHasPermission(user.role, "documents.export")) {
    return NextResponse.json({ error: "Brak uprawnień." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.some((x) => typeof x !== "string")) {
    return NextResponse.json({ error: "Oczekiwano tablicy identyfikatorów." }, { status: 400 });
  }
  const idList = ids as string[];
  if (idList.length === 0) {
    return NextResponse.json({ error: "Brak faktur." }, { status: 400 });
  }
  if (idList.length > 100) {
    return NextResponse.json({ error: "Maksymalnie 100 faktur naraz." }, { status: 400 });
  }

  const docs = await prisma.document.findMany({
    where: { id: { in: idList }, organizationId: orgId },
    include: {
      contractor: { select: { name: true, nip: true } },
      project: { select: { name: true } },
    },
  });

  const header = [
    "numer_faktury",
    "kontrahent",
    "nip",
    "data_wystawienia",
    "data_platnosci",
    "kwota_netto",
    "kwota_brutto",
    "vat",
    "status",
    "projekt",
  ].join(",");

  const lines = docs.map((d) =>
    [
      csvEscape(d.invoiceNumber),
      csvEscape(d.contractor?.name ?? ""),
      csvEscape(d.contractor?.nip ?? d.ocrContractorNip ?? ""),
      csvEscape(d.issueDate?.toISOString().slice(0, 10) ?? ""),
      csvEscape(d.paymentDate?.toISOString().slice(0, 10) ?? ""),
      csvEscape(d.amountNet?.toString() ?? ""),
      csvEscape(d.amountGross?.toString() ?? ""),
      csvEscape(d.amountVat?.toString() ?? ""),
      csvEscape(documentStatusPl(d.status)),
      csvEscape(d.project?.name ?? ""),
    ].join(","),
  );

  const csv = [header, ...lines].join("\n");

  const metadata = {
    generatedAt: new Date().toISOString(),
    generatedBy: { email: user.email, id: user.id },
    count: docs.length,
    documents: docs.map((d) => ({
      id: d.id,
      fileName: d.fileName,
      filePath: d.filePath,
      downloadUrl: `/api/files/${encodeURIComponent(d.filePath)}`,
      invoiceNumber: d.invoiceNumber,
      contractor: d.contractor?.name ?? "—",
      nip: d.contractor?.nip ?? d.ocrContractorNip,
      status: d.status,
      project: d.project?.name ?? "—",
    })),
  };

  return NextResponse.json({
    csv,
    metadata,
    documents: metadata.documents,
  });
}
