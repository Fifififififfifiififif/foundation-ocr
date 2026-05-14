import type { Document, Prisma } from "@/generated/prisma";

const TRACKED_FIELDS = [
  "invoiceNumber",
  "issueDate",
  "paymentDate",
  "amountNet",
  "amountVat",
  "amountGross",
  "documentType",
  "ocrVendorName",
  "ocrContractorNip",
  "ocrBankAccount",
  "expenseCategory",
  "notes",
  "status",
  "contractorId",
  "projectId",
] as const;

type TrackedField = (typeof TRACKED_FIELDS)[number];

function serialize(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === "object" && val !== null && "toString" in val) {
    return String(val);
  }
  return String(val);
}

export async function recordDocumentChanges(
  tx: Prisma.TransactionClient,
  organizationId: string,
  documentId: string,
  userId: string,
  before: Partial<Document>,
  after: Partial<Document>,
): Promise<void> {
  const rows: { fieldName: string; oldValue: string | null; newValue: string | null }[] =
    [];

  for (const key of TRACKED_FIELDS) {
    const oldV = serialize(before[key]);
    const newV = serialize(after[key]);
    if (oldV !== newV) {
      rows.push({ fieldName: key, oldValue: oldV, newValue: newV });
    }
  }

  if (rows.length === 0) return;

  await tx.documentHistory.createMany({
    data: rows.map((r) => ({
      organizationId,
      documentId,
      userId,
      fieldName: r.fieldName,
      oldValue: r.oldValue,
      newValue: r.newValue,
    })),
  });
}

export { TRACKED_FIELDS };
export type { TrackedField };
