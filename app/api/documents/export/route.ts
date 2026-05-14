import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

import prisma from "@/lib/prisma";
import { documentsToCsv } from "@/lib/csv";
import { getAppContext } from "@/lib/app-context";
import { roleHasPermission } from "@/lib/permissions";
import type { DocumentStatus } from "@/generated/prisma";
import { buildDocumentWhere } from "@/lib/queries/document-list";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";

export async function GET(request: NextRequest) {
  const { organizationId: orgId, user } = await getAppContext();
  if (!roleHasPermission(user.role, "documents.export")) {
    return new NextResponse("Brak uprawnień.", { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const projectId = sp.get("projectId") || undefined;
  const contractorId = sp.get("contractorId") || undefined;
  const noProject = sp.get("noProject") === "1";
  const noContractor = sp.get("noContractor") === "1";
  const status =
    sp.get("status") && ["draft", "review", "approved"].includes(sp.get("status")!)
      ? (sp.get("status") as DocumentStatus)
      : undefined;
  const from = sp.get("from") || undefined;
  const to = sp.get("to") || undefined;

  const where = buildDocumentWhere({
    organizationId: orgId,
    projectId,
    contractorId,
    noProject: noProject || undefined,
    noContractor: noContractor || undefined,
    status,
    from,
    to,
  });

  const docs = await prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: { name: true, grantNumber: true, fundingSource: true },
      },
      contractor: { select: { name: true, nip: true } },
    },
  });

  const csv = documentsToCsv(
    docs.map((d) => ({
      ...d,
      contractor: {
        name: d.contractor?.name ?? UNASSIGNED_LABEL,
        nip: d.contractor?.nip ?? "",
      },
      project: d.project ?? {
        name: UNASSIGNED_LABEL,
        grantNumber: "",
        fundingSource: "",
      },
    })),
  );

  const filename = `dokumenty-${format(new Date(), "yyyy-MM-dd")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
