import type { ParsedDocumentFields, ParsedInvoice } from "@/lib/ocr/invoice-types";

/** Mapowanie pełnego wyniku na pola używane przez formularze i Prisma. */
export function toLegacyDocumentFields(inv: ParsedInvoice): ParsedDocumentFields {
  const notesParts: string[] = [];
  if (inv.notes) notesParts.push(inv.notes);
  if (inv.buyer.name) notesParts.push(`Nabywca (OCR): ${inv.buyer.name}`);
  if (inv.buyer.taxId) notesParts.push(`NIP nabywcy (OCR): ${inv.buyer.taxId}`);
  if (inv.paymentMethod) notesParts.push(`Płatność: ${inv.paymentMethod}`);
  if (inv.currency) notesParts.push(`Waluta: ${inv.currency}`);

  return {
    invoiceNumber: inv.invoiceNumber,
    issueDate: inv.issueDate,
    paymentDate: inv.dueDate ?? inv.issueDate,
    amountNet: inv.amounts.net,
    vatAmount: inv.amounts.vat,
    amountGross: inv.amounts.gross,
    nip: inv.seller.taxId,
    sellerName: inv.seller.name,
    buyerName: inv.buyer.name,
    documentType: inv.documentType,
    notes: notesParts.length ? notesParts.join("\n\n") : null,
    bankAccount: inv.bank.iban ?? inv.bank.account,
  };
}

/** JSON do kolumny `ocrParsedJson` (serializacja dat). */
export function serializeParsedInvoice(inv: ParsedInvoice) {
  return {
    ...inv,
    issueDate: inv.issueDate?.toISOString() ?? null,
    saleDate: inv.saleDate?.toISOString() ?? null,
    dueDate: inv.dueDate?.toISOString() ?? null,
  };
}
