import { NextRequest, NextResponse } from "next/server";
import { startOfDay } from "date-fns";

import prisma from "@/lib/prisma";
import { getApiAppContext } from "@/lib/api-app-context";
import type { DocumentStatus, Prisma } from "@/generated/prisma";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";

function parseDate(s: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: NextRequest) {
  const resolved = await getApiAppContext({ permission: "calendar.read", module: "CALENDAR" });
  if (!resolved.ok) return resolved.response;
  const orgId = resolved.ctx.organizationId;

  const sp = req.nextUrl.searchParams;
  const from = parseDate(sp.get("from"));
  const to = parseDate(sp.get("to"));
  if (!from || !to) {
    return NextResponse.json(
      { error: "Wymagane parametry: from, to (ISO yyyy-MM-dd)" },
      { status: 400 },
    );
  }

  const issueFrom = parseDate(sp.get("issueFrom"));
  const issueTo = parseDate(sp.get("issueTo"));

  const rangeStart = new Date(issueFrom ?? from);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(issueTo ?? to);
  rangeEnd.setHours(23, 59, 59, 999);

  const contractorId = sp.get("contractorId") || undefined;
  const projectId = sp.get("projectId") || undefined;
  const noContractor = sp.get("noContractor") === "1";
  const noProject = sp.get("noProject") === "1";
  const status =
    sp.get("status") && ["draft", "review", "approved"].includes(sp.get("status")!)
      ? (sp.get("status") as DocumentStatus)
      : undefined;
  const ocr = sp.get("ocr");
  const minGross = sp.get("minGross");
  const maxGross = sp.get("maxGross");
  const overdueOnly = sp.get("overdueOnly") === "1";

  const where: Prisma.DocumentWhereInput = {
    organizationId: orgId,
    archived: false,
    issueDate: {
      not: null,
      gte: rangeStart,
      lte: rangeEnd,
    },
  };

  if (noContractor) {
    where.contractorId = null;
  } else if (contractorId) {
    where.contractorId = contractorId;
  }

  if (noProject) {
    where.projectId = null;
  } else if (projectId) {
    where.projectId = projectId;
  }

  if (ocr === "yes") where.ocrRawText = { not: null };
  if (ocr === "no") where.ocrRawText = null;

  if (overdueOnly) {
    if (status === "approved") {
      return NextResponse.json({ invoices: [] });
    }
    where.paymentDate = { not: null, lt: startOfDay(new Date()) };
    if (status) where.status = status;
    else where.status = { not: "approved" };
  } else if (status) {
    where.status = status;
  }

  if (minGross || maxGross) {
    const g: Prisma.DecimalNullableFilter = {};
    if (minGross) {
      const n = Number.parseFloat(minGross.replace(",", "."));
      if (Number.isFinite(n)) g.gte = n;
    }
    if (maxGross) {
      const n = Number.parseFloat(maxGross.replace(",", "."));
      if (Number.isFinite(n)) g.lte = n;
    }
    where.amountGross = g;
  }

  const docs = await prisma.document.findMany({
    where,
    orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
    select: {
      id: true,
      issueDate: true,
      paymentDate: true,
      invoiceNumber: true,
      amountGross: true,
      status: true,
      filePath: true,
      fileName: true,
      ocrRawText: true,
      contractor: { select: { name: true } },
      project: { select: { name: true } },
    },
  });

  const invoices = docs.map((d) => ({
    id: d.id,
    issueDate: d.issueDate?.toISOString() ?? null,
    paymentDate: d.paymentDate?.toISOString() ?? null,
    invoiceNumber: d.invoiceNumber,
    amountGross: d.amountGross?.toString() ?? null,
    status: d.status,
    contractorName: d.contractor?.name ?? UNASSIGNED_LABEL,
    projectName: d.project?.name ?? UNASSIGNED_LABEL,
    filePath: d.filePath,
    fileName: d.fileName,
    hasOcr: d.ocrRawText != null && d.ocrRawText.length > 0,
  }));

  return NextResponse.json({ invoices });
}
