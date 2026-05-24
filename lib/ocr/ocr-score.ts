import type { DocumentClass } from "@/lib/ocr/document-classify";
import { classifyFromText } from "@/lib/ocr/document-classify";
import { repairOcrText } from "@/lib/ocr/ocr-corrections";
import { parseInvoiceFull } from "@/lib/ocr/parse-invoice";

export type OcrCandidateScore = {
  total: number;
  meanConfidence: number;
  parsingConfidence: number;
  textLength: number;
  fieldHits: number;
  passLabel: string;
};

function countFieldHits(text: string): number {
  let hits = 0;
  if (/\b(faktura|invoice|rechnung|facture)\b/i.test(text)) hits += 1;
  if (/\b(nip|vat\s*id|ust\.?\s*id|tax\s*id)\b/i.test(text)) hits += 1;
  if (/\b(netto|brutto|gross|total|razem|do\s+zap)\b/i.test(text)) hits += 1;
  if (/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/.test(text)) hits += 1;
  if (/\d{1,3}(?:[.\s]\d{3})*[.,]\d{2}/.test(text)) hits += 1;
  if (/\bPL\d{2}\s*\d{4}/i.test(text) || /\b[A-Z]{2}\d{2}[A-Z0-9]{10,}/i.test(text)) hits += 1;
  return hits;
}

/**
 * Ocena kandydata OCR — wyższy = lepszy wynik do zapisu.
 * Priorytet: struktura faktury > pewność Tesseract > długość tekstu.
 */
export function scoreOcrCandidate(
  rawText: string,
  meanConfidence: number,
  passLabel: string,
  expectedClass?: DocumentClass,
): OcrCandidateScore {
  const text = repairOcrText(rawText);
  const parsed = parseInvoiceFull(text, meanConfidence);
  const classified = classifyFromText(text);
  const parseScore = parsed.parsingConfidence ?? 0;
  const fieldHits = countFieldHits(text);
  const textLength = text.trim().length;

  let total =
    meanConfidence * 0.28 +
    parseScore * 0.42 +
    Math.min(18, textLength / 45) +
    fieldHits * 4;

  if (parsed.invoiceNumber) total += 8;
  if (parsed.amounts.gross != null) total += 10;
  if (parsed.amounts.net != null) total += 5;
  if (parsed.seller.taxId || parsed.seller.name) total += 6;
  if (parsed.bank.iban) total += 5;
  if (parsed.lineItems.length > 0) total += 6;

  if (expectedClass && classified.documentClass === expectedClass) {
    total += 4;
  }

  if (textLength < 40) total -= 25;
  if (textLength < 100) total -= 10;

  return {
    total,
    meanConfidence,
    parsingConfidence: parseScore,
    textLength,
    fieldHits,
    passLabel,
  };
}

export function pickBestOcrCandidate<
  T extends { text: string; confidence: number; passLabel: string },
>(candidates: T[], expectedClass?: DocumentClass): T {
  if (candidates.length === 1) return candidates[0]!;

  let best = candidates[0]!;
  let bestScore = -Infinity;

  for (const c of candidates) {
    const s = scoreOcrCandidate(c.text, c.confidence, c.passLabel, expectedClass);
    if (s.total > bestScore) {
      bestScore = s.total;
      best = c;
    }
  }

  return best;
}
