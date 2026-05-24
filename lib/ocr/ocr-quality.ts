import type { ParsedDocumentFields, ParsedInvoice } from "@/lib/ocr/invoice-types";
import { repairOcrText } from "@/lib/ocr/ocr-corrections";
import { parseInvoiceFull } from "@/lib/ocr/parse-invoice";
import { toLegacyDocumentFields } from "@/lib/ocr/legacy-fields";

export type OcrQualityAssessment = {
  manualReviewRequired: boolean;
  reasons: string[];
  fields: ParsedDocumentFields;
  /** Pełna struktura (do UI / JSON w bazie) */
  parsed: ParsedInvoice;
};

const HARD_LOW_CONFIDENCE = 62;
const SOFT_LOW_CONFIDENCE = 78;
const HARD_LOW_PARSE_SCORE = 35;

function isValidPolishNip(digits: string): boolean {
  if (!/^\d{10}$/.test(digits)) return false;
  const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(digits[i]) * weights[i]!;
  const mod = sum % 11;
  const ctrl = mod === 10 ? 0 : mod;
  return ctrl === Number(digits[9]);
}

function amountsCoherent(net: number | null, vat: number | null, gross: number | null): boolean {
  if (gross == null) return net == null && vat == null;
  if (gross != null && net != null && gross + 1e-6 < net) return false;
  if (gross != null && net != null && vat == null) {
    const tol = Math.max(2, Math.abs(gross) * 0.05);
    return gross >= net - tol;
  }
  if (gross != null && net != null && vat != null) {
    const sum = net + vat;
    const tol = Math.max(2, Math.abs(gross) * 0.03);
    if (Math.abs(sum - gross) > tol) return false;
  }
  if (gross != null && net == null && vat != null) {
    const tol = Math.max(2, Math.abs(gross) * 0.05);
    return Math.abs(gross - vat) <= tol || gross >= vat;
  }
  return true;
}

function gateLegacyFields(f: ParsedDocumentFields): ParsedDocumentFields {
  const out = { ...f };

  if (out.nip) {
    const d = out.nip.replace(/\D/g, "");
    if (d.length === 10 && !isValidPolishNip(d)) out.nip = null;
    else if (d.length === 10) out.nip = d;
  }

  if (out.invoiceNumber) {
    const inv = out.invoiceNumber.trim();
    if (inv.length > 48 || !/^[A-Z0-9/\-._\s]+$/i.test(inv)) out.invoiceNumber = null;
  }

  if (out.bankAccount) {
    const b = out.bankAccount.replace(/\s/g, "").toUpperCase();
    if (b.length >= 15 && b.length <= 34 && /^[A-Z]{2}\d{2}/.test(b)) out.bankAccount = b;
    else out.bankAccount = null;
  }

  return out;
}

/**
 * Ocena jakości OCR + parsowania; zwraca pola bezpieczne do zapisu w DB.
 */
export function assessParsedInvoice(
  parsedOrLegacy: ParsedDocumentFields | ParsedInvoice,
  rawText: string,
  meanConfidence: number | null,
): OcrQualityAssessment {
  const parsed: ParsedInvoice =
    "amounts" in parsedOrLegacy
      ? parsedOrLegacy
      : parseInvoiceFull(rawText, meanConfidence);

  let fields = gateLegacyFields(toLegacyDocumentFields(parsed));
  const reasons = [...parsed.warnings];
  let manual = reasons.length > 0;

  const textLen = rawText.trim().length;
  if (textLen > 0 && textLen < 80) {
    manual = true;
    reasons.push("Bardzo krótki tekst z OCR");
  }

  const parseScore = parsed.parsingConfidence ?? 0;

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
        documentType: fields.documentType,
        notes: null,
        bankAccount: null,
      },
      parsed,
    };
  }

  if (parseScore < HARD_LOW_PARSE_SCORE && textLen > 0) {
    manual = true;
    reasons.push("Niski wynik parsowania strukturalnego");
  }

  if (meanConfidence != null && meanConfidence < SOFT_LOW_CONFIDENCE) {
    manual = true;
    if (!reasons.some((r) => r.includes("pewność OCR"))) {
      reasons.push("Średnia pewność OCR — zalecamy dokładne sprawdzenie pól");
    }
  }

  if (!amountsCoherent(fields.amountNet, fields.vatAmount, fields.amountGross)) {
    fields = {
      ...fields,
      amountNet: null,
      vatAmount: null,
      amountGross: null,
    };
    manual = true;
    reasons.push("Kwoty netto / VAT / brutto są niespójne");
  }

  if (fields.nip && fields.nip.length !== 10) {
    fields.nip = null;
    manual = true;
    reasons.push("NIP nie ma poprawnej długości");
  } else if (fields.nip && !isValidPolishNip(fields.nip)) {
    fields.nip = null;
    manual = true;
    reasons.push("NIP nie przeszedł walidacji");
  }

  if (fields.bankAccount && !/^[A-Z]{2}\d{2}/.test(fields.bankAccount)) {
    fields.bankAccount = null;
  }

  return {
    manualReviewRequired: manual,
    reasons: [...new Set(reasons)],
    fields,
    parsed,
  };
}

/** Pipeline: tekst OCR → ocena + pola legacy. */
export function assessOcrText(rawText: string, meanConfidence: number | null): OcrQualityAssessment {
  const repaired = repairOcrText(rawText);
  const parsed = parseInvoiceFull(repaired, meanConfidence);
  return assessParsedInvoice(parsed, repaired, meanConfidence);
}
