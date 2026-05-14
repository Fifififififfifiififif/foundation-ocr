import type { DocumentStatus, Prisma } from "@/generated/prisma";

export type InvoiceListParams = {
  organizationId: string;
  q?: string;
  projectId?: string;
  contractorId?: string;
  /** Tylko dokumenty bez przypisanego projektu */
  noProject?: boolean;
  /** Tylko dokumenty bez przypisanego kontrahenta */
  noContractor?: boolean;
  status?: DocumentStatus;
  from?: string;
  to?: string;
  minGross?: string;
  maxGross?: string;
  sort?: string;
  /** Domyślnie wyklucz zarchiwizowane; przy true — tylko zarchiwizowane */
  archivedOnly?: boolean;
  /** Ograniczenie do dokumentów utworzonych przez użytkownika (RBAC USER). */
  createdByUserId?: string;
};

export function buildDocumentWhere(
  params: InvoiceListParams,
): Prisma.DocumentWhereInput {
  const where: Prisma.DocumentWhereInput = {
    organizationId: params.organizationId,
  };

  if (params.createdByUserId) {
    where.createdByUserId = params.createdByUserId;
  }

  if (params.archivedOnly) {
    where.archived = true;
  } else {
    where.archived = false;
  }

  if (params.noProject) {
    where.projectId = null;
  } else if (params.projectId) {
    where.projectId = params.projectId;
  }

  if (params.noContractor) {
    where.contractorId = null;
  } else if (params.contractorId) {
    where.contractorId = params.contractorId;
  }

  if (params.status) where.status = params.status;

  if (params.from || params.to) {
    where.issueDate = {};
    if (params.from) where.issueDate.gte = new Date(params.from);
    if (params.to) {
      const end = new Date(params.to);
      end.setHours(23, 59, 59, 999);
      where.issueDate.lte = end;
    }
  }

  if (params.minGross || params.maxGross) {
    where.amountGross = {};
    if (params.minGross) {
      const n = Number.parseFloat(params.minGross.replace(",", "."));
      if (Number.isFinite(n)) where.amountGross.gte = n;
    }
    if (params.maxGross) {
      const n = Number.parseFloat(params.maxGross.replace(",", "."));
      if (Number.isFinite(n)) where.amountGross.lte = n;
    }
  }

  const q = params.q?.trim();
  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { fileName: { contains: q, mode: "insensitive" } },
      { ocrVendorName: { contains: q, mode: "insensitive" } },
      { contractor: { is: { name: { contains: q, mode: "insensitive" } } } },
      { project: { is: { name: { contains: q, mode: "insensitive" } } } },
      { project: { is: { grantNumber: { contains: q, mode: "insensitive" } } } },
    ];
  }

  return where;
}

export function documentOrderBy(
  sort?: string,
): Prisma.DocumentOrderByWithRelationInput[] {
  switch (sort) {
    case "created_asc":
      return [{ createdAt: "asc" }];
    case "gross_desc":
      return [{ amountGross: "desc" }];
    case "gross_asc":
      return [{ amountGross: "asc" }];
    case "issue_desc":
      return [{ issueDate: "desc" }];
    case "issue_asc":
      return [{ issueDate: "asc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}
