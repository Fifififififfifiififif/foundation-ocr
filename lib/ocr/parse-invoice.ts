import {
  BUYER_LABELS,
  DISCOUNT_LABELS,
  DUE_DATE_LABELS,
  GROSS_LABELS,
  ISSUE_DATE_LABELS,
  LINE_ITEM_HEADER,
  NET_LABELS,
  PAYMENT_METHOD_LABELS,
  SALE_DATE_LABELS,
  SELLER_LABELS,
  VAT_LABELS,
} from "@/lib/ocr/labels";
import type { InvoiceLineItem, InvoiceParty, ParsedInvoice } from "@/lib/ocr/invoice-types";
import { normalizeOcrText } from "@/lib/ocr/normalize-text";
import {
  detectLanguage,
  extractAllTaxIds,
  extractTaxIdFromPartySection,
  extractCurrency,
  extractDateNearLabel,
  extractEmail,
  extractIban,
  extractLabeledValue,
  extractLargestMoneyAmount,
  extractMoneyNearLabel,
  extractPartiesFromColumns,
  extractPartyBlock,
  sanitizePartyName,
  extractPhone,
  extractSwift,
  extractTaxIdNearLabel,
} from "@/lib/ocr/extract-utils";
import { parseMoneyToNumber } from "@/lib/format/money";

function emptyParty(): InvoiceParty {
  return { name: null, taxId: null, address: null, email: null, phone: null };
}

function extractInvoiceNumber(text: string): string | null {
  const patterns = [
    /(?:^|\n)\s*[„"=]*\s*nr\s*[:\s#]*([0-9]{1,6}\s*\/\s*[0-9]{1,6}(?:\s*\/\s*[0-9]{2,6})?)/im,
    /faktura\s*[\s\S]{0,40}?\bnr\s*[:\s#]*([0-9]{1,6}\s*\/\s*[0-9]{1,6})/im,
    /numer\s+faktury\s*[:\s#]*([A-Z0-9][A-Z0-9/.\-]{2,32})/gi,
    /nr\.?\s*faktury\s*[:\s#]*([A-Z0-9][A-Z0-9/.\-]{2,32})/gi,
    /invoice\s*(?:no|number|#)\s*[:\s#]*([A-Z0-9][A-Z0-9/.\-]{2,32})/gi,
    /rechnungsnummer\s*[:\s#]*([A-Z0-9][A-Z0-9/.\-]{2,32})/gi,
    /facture\s*(?:n[o°]|num[eé]ro)?\s*[:\s#]*([A-Z0-9][A-Z0-9/.\-]{2,32})/gi,
    /(?:faktura\s+vat|faktura|fv)\s+nr\s*[:\s#]*([A-Z0-9][A-Z0-9/.\-]{3,32})/gi,
    /\b(FV[\s/\-]?\d[\d/\-]{4,})\b/gi,
    /\b(\d{1,6}\s*[/]\s*\d{1,4}\s*[/]\s*\d{2,6})\b/g,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m?.[1]) {
      let cleaned = m[1].replace(/\s+/g, " ").replace(/[.,;]+$/, "").trim();
      cleaned = cleaned.replace(/\s+(sprzedawca|nabywca|seller|buyer|data|termin).*$/i, "");
      if (cleaned.length >= 3 && cleaned.length <= 48) return cleaned;
    }
  }
  return null;
}

function extractDocumentType(text: string): string | null {
  const head = text.slice(0, 900).toLowerCase();
  if (/faktura\s+koryguj[aą]ca|credit\s+note/i.test(head)) return "Faktura korygująca";
  if (/faktura\s+vat|vat\s+invoice/i.test(head)) return "Faktura VAT";
  if (/faktura\s+bez\s+vat/i.test(head)) return "Faktura bez VAT";
  if (/faktura\s+pro\s*forma|proforma/i.test(head)) return "Faktura proforma";
  if (/\brechnung\b/i.test(head) && !/faktura/i.test(head.slice(0, 120))) return "Rechnung";
  if (/\binvoice\b/i.test(head)) return "Invoice";
  if (/\bfacture\b/i.test(head)) return "Facture";
  if (/\brachunek\b/i.test(head) && !/faktura/i.test(head.slice(0, 120))) return "Rachunek";
  if (/paragon\s+fiskalny|\bfiskalny\b/i.test(head)) return "Paragon fiskalny";
  if (/\bparagon\b/i.test(head)) return "Paragon";
  if (/\bfaktura\b/i.test(head)) return "Faktura";
  return null;
}

function extractNotes(text: string): string | null {
  const blocks = [
    /(?:uwagi|uwaga|notes?|remarks?|bemerkung)\s*[:\s]\s*([\s\S]{3,500}?)(?=\n\s*(?:NIP|VAT|razem|suma|total|podpis)|\n{3,}|$)/i,
    /(?:informacje\s+dodatkowe|additional\s+info)\s*[:\s]\s*([\s\S]{3,400}?)(?=\n{3,}|$)/i,
  ];
  for (const re of blocks) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m?.[1]) {
      const s = m[1].replace(/\s+/g, " ").trim();
      if (s.length >= 3 && s.length <= 800) return s;
    }
  }
  return null;
}

function extractTaxRates(text: string): number[] {
  const rates = new Set<number>();
  const re = /(?:vat|stawka|tax|mwst|tva)\s*[:\s]*(\d{1,2})\s*%/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[1]);
    if (n >= 0 && n <= 100) rates.add(n);
  }
  return [...rates].sort((a, b) => a - b);
}

function extractLineItems(text: string): InvoiceLineItem[] {
  const lines = text.split("\n");
  const headerIdx = lines.findIndex((l) => LINE_ITEM_HEADER.test(l));
  if (headerIdx === -1) return [];

  const items: InvoiceLineItem[] = [];
  const stopRe =
    /^(razem|suma|total|subtotal|do\s+zap|amount\s+due|vat\s+summary|podsumowanie|netto|brutto)/i;

  for (let i = headerIdx + 1; i < Math.min(lines.length, headerIdx + 80); i++) {
    const line = lines[i]!.trim();
    if (!line || stopRe.test(line)) break;
    if (line.length < 4) continue;

    const nums: number[] = [];
    const numRe = /(\d{1,3}(?:[.\s]\d{3})*|\d+)[.,](\d{2})/g;
    let nm: RegExpExecArray | null;
    while ((nm = numRe.exec(line)) !== null) {
      const n = parseMoneyToNumber(`${nm[1]},${nm[2]}`);
      if (n != null) nums.push(n);
    }

    const vatM = /(\d{1,2})\s*%/.exec(line);
    const vatRate = vatM ? Number(vatM[1]) : null;

    const namePart = line
      .replace(/(\d{1,3}(?:[.\s]\d{3})*|\d+)[.,]\d{2}/g, "")
      .replace(/\d{1,2}\s*%/g, "")
      .replace(/^\d+[\s.)]+/, "")
      .trim();

    if (namePart.length < 2) continue;

    items.push({
      name: namePart.slice(0, 200),
      quantity: null,
      unit: null,
      unitPrice: nums[0] ?? null,
      vatRate,
      netAmount: nums.length >= 2 ? nums[nums.length - 2]! : nums[0] ?? null,
      grossAmount: nums.length >= 1 ? nums[nums.length - 1]! : null,
      lineTotal: nums.length >= 1 ? nums[nums.length - 1]! : null,
    });
    if (items.length >= 50) break;
  }
  return items;
}

function computeParsingConfidence(inv: Omit<ParsedInvoice, "parsingConfidence" | "warnings">): number {
  let score = 0;
  const weights: [boolean, number][] = [
    [!!inv.invoiceNumber, 15],
    [!!inv.issueDate, 12],
    [!!inv.amounts.gross, 15],
    [!!inv.seller.taxId || !!inv.seller.name, 12],
    [!!inv.amounts.net, 8],
    [!!inv.amounts.vat, 8],
    [!!inv.bank.iban, 8],
    [!!inv.dueDate, 6],
    [!!inv.buyer.name, 5],
    [inv.lineItems.length > 0, 6],
    [!!inv.currency, 5],
  ];
  for (const [ok, w] of weights) if (ok) score += w;
  return Math.min(100, score);
}

function buildParty(name: string | null, taxId: string | null, block: string | null): InvoiceParty {
  const slice = block ?? "";
  const cleanName = sanitizePartyName(name);
  return {
    name: cleanName,
    taxId,
    address: block && name ? block.replace(name, "").replace(/^[,;\s]+/, "").trim() || null : null,
    email: extractEmail(slice),
    phone: extractPhone(slice),
  };
}

/** Pełne parsowanie faktury z tekstu OCR. */
export function parseInvoiceFull(rawText: string, ocrMeanConfidence: number | null = null): ParsedInvoice {
  const text = normalizeOcrText(rawText);
  const warnings: string[] = [];

  if (!text) {
    return {
      invoiceNumber: null,
      issueDate: null,
      saleDate: null,
      dueDate: null,
      paymentMethod: null,
      currency: null,
      amounts: { net: null, vat: null, gross: null, discount: null },
      taxRates: [],
      seller: emptyParty(),
      buyer: emptyParty(),
      bank: { account: null, iban: null, swift: null },
      lineItems: [],
      documentType: null,
      notes: null,
      language: "unknown",
      parsingConfidence: 0,
      warnings: ["Brak tekstu OCR"],
    };
  }

  const language = detectLanguage(text);
  const allTaxIds = extractAllTaxIds(text);
  const sellerTaxFromLabel = extractTaxIdNearLabel(text, [/NIP\s*(?:sprzedawcy|wystawcy|dostawcy)/i]);
  const buyerTaxFromLabel = extractTaxIdNearLabel(text, [/NIP\s*(?:nabywcy|kupuj[aą]cego)/i]);
  const sellerTaxFromSection = extractTaxIdFromPartySection(text, SELLER_LABELS, BUYER_LABELS);
  const buyerTaxFromSection = extractTaxIdFromPartySection(text, BUYER_LABELS);

  const columns = extractPartiesFromColumns(text);
  const sellerName = sanitizePartyName(
    columns?.seller.name ?? extractPartyBlock(text, SELLER_LABELS),
  );
  const buyerName = sanitizePartyName(
    columns?.buyer.name ?? extractPartyBlock(text, BUYER_LABELS),
  );

  let sellerTaxId =
    columns?.seller.taxId ??
    sellerTaxFromLabel ??
    sellerTaxFromSection ??
    null;
  let buyerTaxId =
    columns?.buyer.taxId ?? buyerTaxFromLabel ?? buyerTaxFromSection ?? null;

  /** Pojedynczy NIP bez podziału stron — traktujemy jako sprzedawcę (typowe nagłówki PL). */
  if (!sellerTaxId && !buyerTaxId && allTaxIds.length === 1) {
    sellerTaxId = allTaxIds[0] ?? null;
  }
  if (!buyerTaxId && sellerTaxId && allTaxIds.length > 1) {
    buyerTaxId = allTaxIds.find((id) => id !== sellerTaxId) ?? null;
  }
  if (!sellerTaxId && buyerTaxId && allTaxIds.length > 1) {
    sellerTaxId = allTaxIds.find((id) => id !== buyerTaxId) ?? null;
  }

  const iban = extractIban(text);
  const swift = extractSwift(text);

  let amountGross = extractMoneyNearLabel(text, GROSS_LABELS);
  if (amountGross == null) amountGross = extractLargestMoneyAmount(text);

  const invoice: Omit<ParsedInvoice, "parsingConfidence" | "warnings"> = {
    invoiceNumber: extractInvoiceNumber(text),
    issueDate: extractDateNearLabel(text, ISSUE_DATE_LABELS),
    saleDate: extractDateNearLabel(text, SALE_DATE_LABELS),
    dueDate: extractDateNearLabel(text, DUE_DATE_LABELS),
    paymentMethod: extractLabeledValue(text, PAYMENT_METHOD_LABELS, 80),
    currency: extractCurrency(text),
    amounts: {
      net: extractMoneyNearLabel(text, NET_LABELS),
      vat: extractMoneyNearLabel(text, VAT_LABELS),
      gross: amountGross,
      discount: extractMoneyNearLabel(text, DISCOUNT_LABELS),
    },
    taxRates: extractTaxRates(text),
    seller: buildParty(sellerName, sellerTaxId, columns?.seller.block ?? sellerName),
    buyer: buildParty(buyerName, buyerTaxId, columns?.buyer.block ?? buyerName),
    bank: {
      account: iban,
      iban,
      swift,
    },
    lineItems: extractLineItems(text),
    documentType: extractDocumentType(text),
    notes: extractNotes(text),
    language,
  };

  if (!invoice.invoiceNumber) warnings.push("Nie wykryto numeru faktury");
  if (!invoice.amounts.gross && !invoice.amounts.net) warnings.push("Nie wykryto kwot");
  if (!invoice.seller.taxId && !invoice.seller.name) warnings.push("Brak danych sprzedawcy");
  if (ocrMeanConfidence != null && ocrMeanConfidence < 70) {
    warnings.push("Niska pewność OCR");
  }

  const parsingConfidence = computeParsingConfidence(invoice);

  return {
    ...invoice,
    parsingConfidence,
    warnings,
  };
}
