import prisma from "@/lib/prisma";
import type { StoredFileMeta } from "@/lib/file-storage";
import {
  manualInvoiceSchema,
  parseDateOrNull,
  type ManualInvoiceInput,
} from "@/src/modules/invoices/manual-schema";
import { resolveInvoiceClassification } from "@/src/modules/invoices/classification";
import { writeAuditLog } from "@/src/modules/tenant/audit";

export function parseManualInvoiceInput(input: unknown): ManualInvoiceInput {
  return manualInvoiceSchema.parse(input);
}

export type ManualInvoiceAttachment = StoredFileMeta & { sizeBytes: number };

export async function createManualInvoice(
  organizationId: string,
  userId: string,
  input: ManualInvoiceInput,
  attachment?: ManualInvoiceAttachment | null,
  organizationNip?: string | null,
) {
  const data = input;
  const issueDate = parseDateOrNull(data.issueDate);
  const dueDate = parseDateOrNull(data.dueDate);
  const paymentDate = parseDateOrNull(data.paymentDate);
  const classification = resolveInvoiceClassification({
    organizationNip,
    sellerNip: data.sellerNip,
    buyerNip: data.buyerNip,
    explicit: data.classification,
  });

  let uploadId: string | null = null;
  if (attachment) {
    const upload = await prisma.upload.create({
      data: {
        organizationId,
        uploadedById: userId,
        filePath: attachment.storedName,
        fileName: attachment.displayName,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
      },
    });
    uploadId = upload.id;
  }

  const doc = await prisma.document.create({
    data: {
      organizationId,
      source: "manual",
      status: "approved",
      classification,
      isCommitment: data.isCommitment ?? false,
      invoiceNumber: data.invoiceNumber,
      issueDate,
      dueDate,
      paymentDate,
      amountNet: data.amountNet ?? null,
      amountVat: data.amountVat ?? null,
      amountGross: data.amountGross ?? null,
      currency: data.currency || "PLN",
      sellerName: data.sellerName,
      sellerNip: data.sellerNip,
      sellerAddress: data.sellerAddress,
      sellerEmail: data.sellerEmail,
      sellerPhone: data.sellerPhone,
      buyerName: data.buyerName,
      buyerNip: data.buyerNip,
      buyerAddress: data.buyerAddress,
      paymentMethod: data.paymentMethod,
      bankAccount: data.bankAccount,
      iban: data.iban,
      notes: data.notes,
      expenseCategory: data.expenseCategory,
      projectId: data.projectId || null,
      contractorId: data.contractorId || null,
      createdByUserId: userId,
      filePath: attachment?.storedName ?? null,
      fileName: attachment?.displayName ?? null,
      mimeType: attachment?.mimeType ?? null,
      uploadId,
      lineItems: {
        create: data.lineItems.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice ?? null,
          vatRate: item.vatRate ?? null,
          netAmount: item.netAmount ?? null,
          vatAmount: item.vatAmount ?? null,
          grossAmount: item.grossAmount ?? null,
          sortOrder: i,
        })),
      },
    },
    include: { lineItems: true, upload: true },
  });

  await writeAuditLog({
    organizationId,
    userId,
    action: "invoice.created_manual",
    entityType: "document",
    entityId: doc.id,
    metadata: {
      invoiceNumber: doc.invoiceNumber,
      hasAttachment: Boolean(attachment),
    },
  });

  return doc;
}

export async function updateManualInvoice(
  documentId: string,
  organizationId: string,
  userId: string,
  input: ManualInvoiceInput,
  organizationNip?: string | null,
) {
  const existing = await prisma.document.findFirst({
    where: { id: documentId, organizationId },
    include: { lineItems: true },
  });
  if (!existing) throw new Error("Document not found");

  const data = input;
  const source = existing.source === "ocr" ? "hybrid" : existing.source;
  const classification = resolveInvoiceClassification({
    organizationNip,
    sellerNip: data.sellerNip,
    buyerNip: data.buyerNip,
    explicit: data.classification,
  });

  await prisma.documentLineItem.deleteMany({ where: { documentId } });

  const doc = await prisma.document.update({
    where: { id: documentId },
    data: {
      source,
      classification,
      isCommitment: data.isCommitment ?? false,
      invoiceNumber: data.invoiceNumber,
      issueDate: parseDateOrNull(data.issueDate),
      dueDate: parseDateOrNull(data.dueDate),
      paymentDate: parseDateOrNull(data.paymentDate),
      amountNet: data.amountNet ?? null,
      amountVat: data.amountVat ?? null,
      amountGross: data.amountGross ?? null,
      currency: data.currency || "PLN",
      sellerName: data.sellerName,
      sellerNip: data.sellerNip,
      sellerAddress: data.sellerAddress,
      sellerEmail: data.sellerEmail,
      sellerPhone: data.sellerPhone,
      buyerName: data.buyerName,
      buyerNip: data.buyerNip,
      buyerAddress: data.buyerAddress,
      paymentMethod: data.paymentMethod,
      bankAccount: data.bankAccount,
      iban: data.iban,
      notes: data.notes,
      expenseCategory: data.expenseCategory,
      projectId: data.projectId || null,
      contractorId: data.contractorId || null,
      lineItems: {
        create: data.lineItems.map((item, i) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice ?? null,
          vatRate: item.vatRate ?? null,
          netAmount: item.netAmount ?? null,
          vatAmount: item.vatAmount ?? null,
          grossAmount: item.grossAmount ?? null,
          sortOrder: i,
        })),
      },
    },
    include: { lineItems: true },
  });

  await writeAuditLog({
    organizationId,
    userId,
    action: "invoice.updated_manual",
    entityType: "document",
    entityId: doc.id,
  });

  return doc;
}
