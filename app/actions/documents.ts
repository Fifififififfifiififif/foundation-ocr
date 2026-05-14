"use server";

import fs from "fs/promises";
import path from "path";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import prisma from "@/lib/prisma";
import { getOrganizationById } from "@/lib/organization-settings";
import { requirePermission } from "@/lib/require-permission";
import {
  documentFormSchema,
  documentVerifyFieldsSchema,
} from "@/lib/validations";
import {
  effectiveUploadMimeType,
  validateUpload,
  saveUploadedFile,
  validateFileSignature,
} from "@/lib/uploads";
import {
  assessParsedInvoice,
  describeOcrFailure,
  parseInvoiceFromText,
  runOcr,
} from "@/lib/ocr";
import { recordDocumentChanges } from "@/lib/document-history";
import {
  snapshotEditFormData,
  snapshotVerifyFormData,
  type DocumentEditFormActionState,
  type DocumentVerifyFormActionState,
} from "@/lib/document-form-snapshot";
import { upsertDocumentInboxNotification } from "@/lib/in-app-notifications";
import {
  normalizeDocumentJsonIds,
  parseOptionalCuid,
  suggestContractorIdFromOcr,
} from "@/lib/optional-relation-ids";

function mergeOcrBuyerNote(notes: string | null, buyerName: string | null): string | null {
  const n = notes?.trim() || null;
  const b = buyerName?.trim() || null;
  if (!b) return n;
  const tag = `Nabywca (OCR): ${b}`;
  if (n?.includes("Nabywca (OCR):")) return n;
  return n ? `${tag}\n\n${n}` : tag;
}

export async function submitCreateDocument(formData: FormData) {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  const org = await getOrganizationById(orgId);

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    redirect(`/documents/new?error=${encodeURIComponent("Wybierz plik do przesłania.")}`);
  }

  const validation = validateUpload(file, { maxBytes: org.maxUploadBytes });
  if (!validation.ok) {
    redirect(`/documents/new?error=${encodeURIComponent(validation.error)}`);
  }

  const userProjectId = parseOptionalCuid(formData.get("projectId"));
  const userContractorId = parseOptionalCuid(formData.get("contractorId"));

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = effectiveUploadMimeType(file);
  const sig = validateFileSignature(buffer, mimeType);
  if (!sig.ok) {
    redirect(`/documents/new?error=${encodeURIComponent(sig.error)}`);
  }
  const { storedName, displayName, mimeType: storedMime } = await saveUploadedFile(
    buffer,
    file.name,
    mimeType,
  );

  let ocrText = "";
  let ocrMeanConfidence: number | null = null;
  let ocrError = "";
  if (org.ocrEnabled) {
    try {
      const ocr = await runOcr(buffer, storedMime);
      ocrText = ocr.text;
      ocrMeanConfidence = ocr.meanConfidence;
    } catch (e: unknown) {
      ocrError = describeOcrFailure(e);
      console.error("OCR failed:", e);
    }
  }

  const rawHints = parseInvoiceFromText(ocrText);
  const assessed = assessParsedInvoice(rawHints, ocrText, ocrMeanConfidence);
  const hints = assessed.fields;
  const manualReview = assessed.manualReviewRequired;
  const qualityReasons = assessed.reasons;

  const finalProjectId = userProjectId;
  let finalContractorId = userContractorId;
  if (!finalContractorId) {
    finalContractorId = await suggestContractorIdFromOcr(prisma, {
      organizationId: orgId,
      explicitId: null,
      nip: hints.nip,
      vendorName: hints.sellerName,
    });
  }

  const doc = await prisma.document.create({
    data: {
      organizationId: orgId,
      filePath: storedName,
      fileName: displayName,
      mimeType: storedMime,
      ocrRawText: ocrText || null,
      ocrMeanConfidence: ocrMeanConfidence != null ? Math.round(ocrMeanConfidence) : null,
      ocrManualReviewRecommended: manualReview,
      ocrQualityReasons: qualityReasons.length ? qualityReasons : undefined,
      invoiceNumber: hints.invoiceNumber,
      issueDate: hints.issueDate,
      paymentDate: hints.paymentDate,
      amountNet: hints.amountNet,
      amountVat: hints.vatAmount,
      amountGross: hints.amountGross,
      documentType: hints.documentType,
      ocrVendorName: hints.sellerName,
      ocrContractorNip: hints.nip,
      ocrBankAccount: hints.bankAccount,
      notes: mergeOcrBuyerNote(hints.notes, hints.buyerName),
      status: ocrText ? "review" : "draft",
      projectId: finalProjectId,
      contractorId: finalContractorId,
      createdByUserId: user.id,
    },
  });

  await upsertDocumentInboxNotification({
    userId: user.id,
    organizationId: orgId,
    documentId: doc.id,
    fileName: displayName,
    ocrEnabled: org.ocrEnabled,
    ocrError: ocrError || null,
    manualReviewRecommended: manualReview,
    ocrTextPresent: Boolean(ocrText.trim()),
  });

  revalidatePath("/documents");
  const verifyUrl = ocrError
    ? `/documents/${doc.id}/verify?ocrError=${encodeURIComponent(ocrError)}`
    : `/documents/${doc.id}/verify`;
  redirect(verifyUrl);
}

export async function submitUpdateDocumentAction(
  id: string,
  _prevState: DocumentEditFormActionState,
  formData: FormData,
): Promise<DocumentEditFormActionState> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");

  const values = snapshotEditFormData(formData);
  const parsed = documentFormSchema.safeParse(values);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      status: "invalid" as const,
      message: parsed.error.issues[0]?.message ?? "Błąd walidacji",
      values,
      fieldErrors: flat.fieldErrors,
    };
  }

  const before = await prisma.document.findUniqueOrThrow({ where: { id, organizationId: orgId } });

  const updated = await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id, organizationId: orgId },
      data: {
        invoiceNumber: parsed.data.invoiceNumber,
        issueDate: parsed.data.issueDate,
        paymentDate: parsed.data.paymentDate,
        amountNet: parsed.data.amountNet,
        amountVat: parsed.data.amountVat,
        amountGross: parsed.data.amountGross,
        documentType: parsed.data.documentType,
        ocrVendorName: parsed.data.ocrVendorName,
        ocrContractorNip: parsed.data.ocrContractorNip,
        ocrBankAccount: parsed.data.ocrBankAccount,
        expenseCategory: parsed.data.expenseCategory ?? null,
        notes: parsed.data.notes,
        status: parsed.data.status,
        contractorId: parsed.data.contractorId,
        projectId: parsed.data.projectId,
      },
    });

    await recordDocumentChanges(tx, orgId, id, user.id, before, doc);
    return doc;
  });

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  return { status: "saved" as const, redirectTo: `/documents/${updated.id}` };
}

export async function submitVerifyDocumentAction(
  id: string,
  _prevState: DocumentVerifyFormActionState,
  formData: FormData,
): Promise<DocumentVerifyFormActionState> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  const intent = String(formData.get("_intent") ?? "approve");
  const values = snapshotVerifyFormData(formData);
  const parsed = documentVerifyFieldsSchema.safeParse(values);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      status: "invalid" as const,
      message: parsed.error.issues[0]?.message ?? "Błąd walidacji",
      values,
      fieldErrors: flat.fieldErrors,
    };
  }

  const before = await prisma.document.findUniqueOrThrow({ where: { id, organizationId: orgId } });
  const nextStatus = intent === "draft" ? "draft" : "approved";

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id, organizationId: orgId },
      data: {
        invoiceNumber: parsed.data.invoiceNumber,
        issueDate: parsed.data.issueDate,
        paymentDate: parsed.data.paymentDate,
        amountNet: parsed.data.amountNet,
        amountVat: parsed.data.amountVat,
        amountGross: parsed.data.amountGross,
        documentType: parsed.data.documentType,
        ocrVendorName: parsed.data.ocrVendorName,
        ocrContractorNip: parsed.data.ocrContractorNip,
        ocrBankAccount: parsed.data.ocrBankAccount,
        expenseCategory: parsed.data.expenseCategory ?? null,
        notes: parsed.data.notes,
        projectId: parsed.data.projectId,
        contractorId: parsed.data.contractorId,
        status: nextStatus,
        ocrManualReviewRecommended: false,
      },
    });

    await recordDocumentChanges(tx, orgId, id, user.id, before, doc);
  });

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  return { status: "saved" as const, redirectTo: `/documents/${id}` };
}

export async function submitDeleteDocument(id: string) {
  const { organizationId: orgId, user } = await requirePermission("documents.write");

  await prisma.$transaction(async (tx) => {
    await tx.documentHistory.deleteMany({ where: { documentId: id, organizationId: orgId } });
    await tx.document.delete({ where: { id, organizationId: orgId } });
  });

  revalidatePath("/documents");
  redirect("/documents");
}

export type DocumentActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export async function retryDocumentOcr(id: string): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  const org = await getOrganizationById(orgId);
  const doc = await prisma.document.findUnique({ where: { id, organizationId: orgId } });
  if (!doc) return { ok: false, error: "Nie znaleziono dokumentu." };

  const fullPath = path.join(process.cwd(), "uploads", doc.filePath);
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(fullPath);
  } catch {
    return { ok: false, error: "Nie można odczytać pliku z dysku." };
  }

  let ocrText = "";
  let ocrMeanConfidence: number | null = null;
  try {
    const ocr = await runOcr(buffer, doc.mimeType);
    ocrText = ocr.text;
    ocrMeanConfidence = ocr.meanConfidence;
  } catch (e: unknown) {
    const msg = describeOcrFailure(e);
    console.error("OCR retry failed:", e);
    return { ok: false, error: msg };
  }

  const rawHints = parseInvoiceFromText(ocrText);
  const assessed = assessParsedInvoice(rawHints, ocrText, ocrMeanConfidence);
  const hints = assessed.fields;

  await prisma.document.update({
    where: { id, organizationId: orgId },
    data: {
      ocrRawText: ocrText || null,
      ocrMeanConfidence: ocrMeanConfidence != null ? Math.round(ocrMeanConfidence) : null,
      ocrManualReviewRecommended: assessed.manualReviewRequired,
      ocrQualityReasons: assessed.reasons.length ? assessed.reasons : undefined,
      status: ocrText ? "review" : doc.status,
      invoiceNumber: doc.invoiceNumber ?? hints.invoiceNumber,
      issueDate: doc.issueDate ?? hints.issueDate,
      paymentDate: doc.paymentDate ?? hints.paymentDate,
      amountNet: doc.amountNet ?? hints.amountNet,
      amountVat: doc.amountVat ?? hints.vatAmount,
      amountGross: doc.amountGross ?? hints.amountGross,
      documentType: doc.documentType ?? hints.documentType,
      ocrVendorName: doc.ocrVendorName ?? hints.sellerName,
      ocrContractorNip: doc.ocrContractorNip ?? hints.nip,
      ocrBankAccount: doc.ocrBankAccount ?? hints.bankAccount,
      notes: doc.notes ?? mergeOcrBuyerNote(hints.notes, hints.buyerName),
    },
  });

  await upsertDocumentInboxNotification({
    userId: doc.createdByUserId ?? user.id,
    organizationId: orgId,
    documentId: id,
    fileName: doc.fileName,
    ocrEnabled: org.ocrEnabled,
    ocrError: null,
    manualReviewRecommended: assessed.manualReviewRequired,
    ocrTextPresent: Boolean(ocrText.trim()),
  });

  revalidatePath(`/documents/${id}`);
  revalidatePath(`/documents/${id}/verify`);
  revalidatePath("/documents");
  return { ok: true, message: "OCR został ponownie uruchomiony." };
}

export async function bulkArchiveDocuments(
  ids: string[],
): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  if (!ids.length) return { ok: false, error: "Nie wybrano faktur." };
  await prisma.document.updateMany({
    where: { id: { in: ids }, organizationId: orgId },
    data: { archived: true },
  });
  revalidatePath("/documents");
  return { ok: true, message: "Zarchiwizowano wybrane faktury." };
}

export async function bulkUnarchiveDocuments(
  ids: string[],
): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  if (!ids.length) return { ok: false, error: "Nie wybrano faktur." };
  await prisma.document.updateMany({
    where: { id: { in: ids }, organizationId: orgId },
    data: { archived: false },
  });
  revalidatePath("/documents");
  return { ok: true, message: "Przywrócono faktury z archiwum." };
}

export async function bulkApproveDocuments(
  ids: string[],
): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  if (!ids.length) return { ok: false, error: "Nie wybrano faktur." };
  await prisma.document.updateMany({
    where: { id: { in: ids }, organizationId: orgId },
    data: { status: "approved" },
  });
  revalidatePath("/documents");
  return { ok: true, message: "Oznaczono jako zatwierdzone." };
}

export async function bulkDeleteDocuments(
  ids: string[],
): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  if (!ids.length) return { ok: false, error: "Nie wybrano faktur." };
  await prisma.$transaction(async (tx) => {
    await tx.documentHistory.deleteMany({
      where: { organizationId: orgId, documentId: { in: ids } },
    });
    await tx.document.deleteMany({ where: { id: { in: ids }, organizationId: orgId } });
  });
  revalidatePath("/documents");
  return { ok: true, message: "Usunięto wybrane faktury." };
}

export async function updateDocumentFromJson(
  id: string,
  raw: unknown,
): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  const parsed = documentFormSchema.safeParse(normalizeDocumentJsonIds(raw));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Błąd walidacji",
    };
  }

  const before = await prisma.document.findUniqueOrThrow({ where: { id, organizationId: orgId } });

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id, organizationId: orgId },
      data: {
        invoiceNumber: parsed.data.invoiceNumber,
        issueDate: parsed.data.issueDate,
        paymentDate: parsed.data.paymentDate,
        amountNet: parsed.data.amountNet,
        amountVat: parsed.data.amountVat,
        amountGross: parsed.data.amountGross,
        documentType: parsed.data.documentType,
        ocrVendorName: parsed.data.ocrVendorName,
        ocrContractorNip: parsed.data.ocrContractorNip,
        ocrBankAccount: parsed.data.ocrBankAccount,
        expenseCategory: parsed.data.expenseCategory ?? null,
        notes: parsed.data.notes,
        status: parsed.data.status,
        contractorId: parsed.data.contractorId,
        projectId: parsed.data.projectId,
      },
    });
    await recordDocumentChanges(tx, orgId, id, user.id, before, doc);
  });

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  return { ok: true, message: "Zapisano zmiany." };
}

export async function verifyApproveFromJson(
  id: string,
  raw: unknown,
): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  const parsed = documentVerifyFieldsSchema.safeParse(normalizeDocumentJsonIds(raw));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Błąd walidacji",
    };
  }

  const before = await prisma.document.findUniqueOrThrow({ where: { id, organizationId: orgId } });

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id, organizationId: orgId },
      data: {
        invoiceNumber: parsed.data.invoiceNumber,
        issueDate: parsed.data.issueDate,
        paymentDate: parsed.data.paymentDate,
        amountNet: parsed.data.amountNet,
        amountVat: parsed.data.amountVat,
        amountGross: parsed.data.amountGross,
        documentType: parsed.data.documentType,
        ocrVendorName: parsed.data.ocrVendorName,
        ocrContractorNip: parsed.data.ocrContractorNip,
        ocrBankAccount: parsed.data.ocrBankAccount,
        expenseCategory: parsed.data.expenseCategory ?? null,
        notes: parsed.data.notes,
        projectId: parsed.data.projectId,
        contractorId: parsed.data.contractorId,
        status: "approved",
        ocrManualReviewRecommended: false,
      },
    });
    await recordDocumentChanges(tx, orgId, id, user.id, before, doc);
  });

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  return { ok: true, message: "Faktura zatwierdzona." };
}

export async function verifyDraftFromJson(
  id: string,
  raw: unknown,
): Promise<DocumentActionResult> {
  const { organizationId: orgId, user } = await requirePermission("documents.write");
  const parsed = documentVerifyFieldsSchema.safeParse(normalizeDocumentJsonIds(raw));
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Błąd walidacji",
    };
  }

  const before = await prisma.document.findUniqueOrThrow({ where: { id, organizationId: orgId } });

  await prisma.$transaction(async (tx) => {
    const doc = await tx.document.update({
      where: { id, organizationId: orgId },
      data: {
        invoiceNumber: parsed.data.invoiceNumber,
        issueDate: parsed.data.issueDate,
        paymentDate: parsed.data.paymentDate,
        amountNet: parsed.data.amountNet,
        amountVat: parsed.data.amountVat,
        amountGross: parsed.data.amountGross,
        documentType: parsed.data.documentType,
        ocrVendorName: parsed.data.ocrVendorName,
        ocrContractorNip: parsed.data.ocrContractorNip,
        ocrBankAccount: parsed.data.ocrBankAccount,
        expenseCategory: parsed.data.expenseCategory ?? null,
        notes: parsed.data.notes,
        projectId: parsed.data.projectId,
        contractorId: parsed.data.contractorId,
        status: "draft",
        ocrManualReviewRecommended: false,
      },
    });
    await recordDocumentChanges(tx, orgId, id, user.id, before, doc);
  });

  revalidatePath(`/documents/${id}`);
  revalidatePath("/documents");
  return { ok: true, message: "Zapisano szkic." };
}
