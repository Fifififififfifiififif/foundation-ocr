/** Public API parsowania faktur — kompatybilność wsteczna + pełny wynik. */

export type { ParsedDocumentFields, ParsedInvoice } from "@/lib/ocr/invoice-types";
export { parseInvoiceFull } from "@/lib/ocr/parse-invoice";
export { toLegacyDocumentFields, serializeParsedInvoice } from "@/lib/ocr/legacy-fields";

import type { ParsedDocumentFields } from "@/lib/ocr/invoice-types";
import { toLegacyDocumentFields } from "@/lib/ocr/legacy-fields";
import { parseInvoiceFull } from "@/lib/ocr/parse-invoice";

/** Parsuje tekst OCR → pola dokumentu (legacy). */
export function parseInvoiceFromText(text: string, ocrMeanConfidence?: number | null): ParsedDocumentFields {
  return toLegacyDocumentFields(parseInvoiceFull(text, ocrMeanConfidence ?? null));
}
