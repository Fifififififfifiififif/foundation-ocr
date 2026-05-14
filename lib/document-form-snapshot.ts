/** Pola z formularza weryfikacji OCR (bez `_intent`). */
export const VERIFY_DOCUMENT_FIELD_KEYS = [
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
  "notes",
  "projectId",
  "contractorId",
  "expenseCategory",
] as const;

export type VerifyDocumentFieldKey = (typeof VERIFY_DOCUMENT_FIELD_KEYS)[number];

export function snapshotVerifyFormData(fd: FormData): Record<VerifyDocumentFieldKey, string> {
  const o = {} as Record<VerifyDocumentFieldKey, string>;
  for (const k of VERIFY_DOCUMENT_FIELD_KEYS) {
    o[k] = String(fd.get(k) ?? "");
  }
  return o;
}

export const EDIT_DOCUMENT_FIELD_KEYS = [
  ...VERIFY_DOCUMENT_FIELD_KEYS,
  "status",
] as const;

export type EditDocumentFieldKey = (typeof EDIT_DOCUMENT_FIELD_KEYS)[number];

export function snapshotEditFormData(fd: FormData): Record<EditDocumentFieldKey, string> {
  const o = {} as Record<EditDocumentFieldKey, string>;
  for (const k of EDIT_DOCUMENT_FIELD_KEYS) {
    o[k] = String(fd.get(k) ?? "");
  }
  return o;
}

export type DocumentVerifyFormActionState =
  | { status: "idle" }
  | {
      status: "invalid";
      message: string;
      values: Record<VerifyDocumentFieldKey, string>;
      fieldErrors: Partial<Record<VerifyDocumentFieldKey, string[]>>;
    }
  | { status: "saved"; redirectTo: string };

export type DocumentEditFormActionState =
  | { status: "idle" }
  | {
      status: "invalid";
      message: string;
      values: Record<EditDocumentFieldKey, string>;
      fieldErrors: Partial<Record<EditDocumentFieldKey, string[]>>;
    }
  | { status: "saved"; redirectTo: string };
