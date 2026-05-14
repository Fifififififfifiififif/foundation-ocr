import type { ParsedDocumentFields } from "./parser";

export type OcrQualityAssessment = {
  manualReviewRequired: boolean;
  reasons: string[];
  /** Values safe to persist after quality gates */
  fields: ParsedDocumentFields;
};

const HARD_LOW_CONFIDENCE = 62;
const SOFT_LOW_CONFIDENCE = 78;

function isValidPolishNip(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * weights[i]!;
  const mod = sum % 11;
  const ctrl = mod === 10 ? 0 : mod;
  return ctrl === Number(digits[9]);
}

function amountsCoherent(
  net: number | null,
  vat: number | null,
  gross: number | null,
): { ok: boolean } {
  if (gross != null && net != null && gross + 1e-6 < net) return { ok: false };
  if (gross != null && net != null && vat != null) {
    const sum = net + vat;
    const tol = Math.max(2, Math.abs(gross) * 0.02);
    if (Math.abs(sum - gross) > tol) return { ok: false };
  }
  if (gross != null && net != null && vat == null) {
    if (gross + 1e-6 < net) return { ok: false };
  }
  return { ok: true };
}

/**
 * Drop untrusted parsed values; set flags for UI when manual verification is needed.
 */
export function assessParsedInvoice(
  parsed: ParsedDocumentFields,
  rawText: string,
  meanConfidence: number | null,
): OcrQualityAssessment {
  const reasons: string[] = [];
  let manual = false;
  const f: ParsedDocumentFields = { ...parsed };

  const textLen = rawText.trim().length;
  if (textLen > 0 && textLen < 80) {
    manual = true;
    reasons.push("Bardzo krótki tekst z OCR");
  }

  if (meanConfidence != null && meanConfidence < HARD_LOW_CONFIDENCE) {
    manual = true;
    reasons.push("Niska średnia pewności rozpoznawania (OCR)");
    return {
      manualReviewRequired: true,
      reasons,
      fields: {
        invoiceNumber: null,
        issueDate: null,
        paymentDate: null,
        amountNet: null,
        vatAmount: null,
        amountGross: null,
        nip: null,
        sellerName: null,
        buyerName: null,
        documentType: f.documentType,
        notes: null,
        bankAccount: null,
      },
    };
  }

  if (meanConfidence != null && meanConfidence < SOFT_LOW_CONFIDENCE) {
    manual = true;
    reasons.push("Średnia pewność OCR — zalecamy dokładne sprawdzenie pól");
  }

  if (f.nip) {
    const d = f.nip.replace(/\D/g, "");
    if (d.length !== 10) {
      f.nip = null;
      manual = true;
      reasons.push("NIP nie ma poprawnej długości");
    } else if (!isValidPolishNip(d)) {
      f.nip = null;
      manual = true;
      reasons.push("NIP nie przeszedł walidacji");
    }
  }

  if (!amountsCoherent(f.amountNet, f.vatAmount, f.amountGross).ok) {
    f.amountNet = null;
    f.vatAmount = null;
    f.amountGross = null;
    manual = true;
    reasons.push("Kwoty netto / VAT / brutto są niespójne");
  }

  if (f.invoiceNumber) {
    const inv = f.invoiceNumber.trim();
    if (inv.length > 48 || !/^[A-Z0-9/\-._]+$/i.test(inv)) {
      f.invoiceNumber = null;
      manual = true;
      reasons.push("Podejrzany numer faktury");
    }
  }

  if (f.bankAccount) {
    const b = f.bankAccount.replace(/\s/g, "");
    if (!/^PL\d{26}$/i.test(b)) {
      f.bankAccount = null;
      manual = true;
      reasons.push("Numer konta nie wygląda na poprawny IBAN PL");
    } else {
      f.bankAccount = b.toUpperCase();
    }
  }

  return {
    manualReviewRequired: manual,
    reasons,
    fields: f,
  };
}
