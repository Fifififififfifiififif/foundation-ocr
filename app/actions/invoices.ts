"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getOrganizationById } from "@/lib/organization-settings";
import { rethrowNextNavigation } from "@/lib/rethrow-navigation";
import { requirePermission } from "@/lib/require-permission";
import {
  effectiveUploadMimeType,
  validateFileSignature,
  validateUpload,
} from "@/lib/uploads";
import { storeUploadedFile } from "@/lib/file-storage";
import {
  createManualInvoice,
  parseManualInvoiceInput,
  updateManualInvoice,
  type ManualInvoiceAttachment,
} from "@/src/modules/invoices/create-manual";
import { parseManualInvoiceFromFormData } from "@/src/modules/invoices/parse-form-data";

async function storeOptionalAttachment(
  formData: FormData,
  maxUploadBytes: number,
): Promise<ManualInvoiceAttachment | null> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return null;

  const validation = validateUpload(file, { maxBytes: maxUploadBytes });
  if (!validation.ok) throw new Error(validation.error);

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = effectiveUploadMimeType(file);
  const sig = validateFileSignature(buffer, mimeType);
  if (!sig.ok) throw new Error(sig.error);

  const stored = await storeUploadedFile(buffer, file.name, mimeType);
  return { ...stored, sizeBytes: file.size };
}

export async function submitCreateManualInvoice(formData: FormData) {
  const { organizationId, user } = await requirePermission("documents.write");
  const org = await getOrganizationById(organizationId);

  try {
    const parsed = parseManualInvoiceFromFormData(formData);
    const attachment = await storeOptionalAttachment(formData, org.maxUploadBytes);
    const doc = await createManualInvoice(organizationId, user.id, parsed, attachment, org.nip);
    revalidatePath("/documents");
    redirect(`/documents/${doc.id}`);
  } catch (e) {
    rethrowNextNavigation(e);
    const msg = e instanceof Error ? e.message : "Błąd zapisu faktury";
    redirect(`/documents/manual/new?error=${encodeURIComponent(msg)}`);
  }
}

/** @deprecated — użyj submitCreateManualInvoice(FormData) */
export async function createManualInvoiceAction(input: unknown) {
  const { organizationId, user } = await requirePermission("documents.write");
  const org = await getOrganizationById(organizationId);
  try {
    const parsed = parseManualInvoiceInput(input);
    const doc = await createManualInvoice(organizationId, user.id, parsed, null, org.nip);
    revalidatePath("/documents");
    redirect(`/documents/${doc.id}`);
  } catch (e) {
    rethrowNextNavigation(e);
    const msg = e instanceof Error ? e.message : "Błąd zapisu faktury";
    redirect(`/documents/manual/new?error=${encodeURIComponent(msg)}`);
  }
}

export async function updateManualInvoiceAction(documentId: string, input: unknown) {
  const { organizationId, user } = await requirePermission("documents.write");
  const org = await getOrganizationById(organizationId);
  try {
    const parsed = parseManualInvoiceInput(input);
    await updateManualInvoice(documentId, organizationId, user.id, parsed, org.nip);
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/documents");
    redirect(`/documents/${documentId}`);
  } catch (e) {
    rethrowNextNavigation(e);
    const msg = e instanceof Error ? e.message : "Błąd aktualizacji";
    redirect(`/documents/${documentId}/edit?error=${encodeURIComponent(msg)}`);
  }
}
