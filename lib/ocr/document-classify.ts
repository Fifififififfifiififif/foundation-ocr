/** Heurystyczna klasyfikacja dokumentu przed OCR (wpływa na PSM i profile). */

export type DocumentClass =
  | "invoice"
  | "receipt"
  | "form"
  | "tabular"
  | "generic_text"
  | "unknown";

export type DocumentClassResult = {
  documentClass: DocumentClass;
  /** 0–1 pewność heurystyki */
  confidence: number;
  /** Sugerowane języki Tesseract (nadpisują domyślne gdy wykryto DE/FR) */
  languageHint: string | null;
};

const INVOICE_MARKERS =
  /\b(faktura|invoice|rechnung|facture|rachunek|vat\s+invoice|faktura\s+vat)\b/i;
const RECEIPT_MARKERS = /\b(paragon|receipt|bon\s+fiskalny|kasa)\b/i;
const FORM_MARKERS = /\b(formularz|wniosek|application\s+form|form\s+no)\b/i;
const TABULAR_MARKERS = /\b(lp\.|poz\.|ilość|qty|quantity|jedn\.|unit\s+price|wartość\s+netto)\b/i;

/**
 * Klasyfikacja z surowego tekstu (po OCR) lub z metadanych MIME.
 * Przed OCR używamy tylko MIME + rozmiaru; po pierwszym przebiegu można doprecyzować.
 */
export function classifyFromText(text: string): DocumentClassResult {
  const head = text.slice(0, 2500);
  const lower = head.toLowerCase();

  let documentClass: DocumentClass = "unknown";
  let confidence = 0.4;

  if (RECEIPT_MARKERS.test(head)) {
    documentClass = "receipt";
    confidence = 0.75;
  } else if (INVOICE_MARKERS.test(head)) {
    documentClass = "invoice";
    confidence = 0.85;
    if (TABULAR_MARKERS.test(head)) confidence = 0.92;
  } else if (FORM_MARKERS.test(head)) {
    documentClass = "form";
    confidence = 0.7;
  } else if (TABULAR_MARKERS.test(head) && text.length > 200) {
    documentClass = "tabular";
    confidence = 0.65;
  } else if (text.trim().length > 120) {
    documentClass = "generic_text";
    confidence = 0.55;
  }

  let languageHint: string | null = null;
  if (/\b(rechnung|mwst|ust\.?-id|verk[aä]ufer)\b/i.test(lower)) {
    languageHint = "deu+eng";
  } else if (/\b(facture|tva|siret|acheteur)\b/i.test(lower)) {
    languageHint = "fra+eng";
  } else if (/\b(faktura|nip|sprzedawca|nabywca)\b/i.test(lower)) {
    languageHint = "pol+eng";
  }

  return { documentClass, confidence, languageHint };
}

/** Domyślna klasa przed pierwszym OCR (faktury są priorytetem w tej aplikacji). */
export function defaultPreOcrClass(mimeType: string): DocumentClassResult {
  if (mimeType === "application/pdf") {
    return { documentClass: "invoice", confidence: 0.5, languageHint: null };
  }
  return { documentClass: "invoice", confidence: 0.45, languageHint: null };
}
