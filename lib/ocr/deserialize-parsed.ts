import type { ParsedInvoice } from "@/lib/ocr/invoice-types";

/** Odczyt `ocrParsedJson` z bazy → ParsedInvoice. */
export function deserializeParsedInvoice(json: unknown): ParsedInvoice | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;

  const parseDate = (v: unknown): Date | null => {
    if (v == null) return null;
    if (v instanceof Date) return v;
    if (typeof v === "string") {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };

  const party = (p: unknown) => {
    const x = (p && typeof p === "object" ? p : {}) as Record<string, unknown>;
    return {
      name: typeof x.name === "string" ? x.name : null,
      taxId: typeof x.taxId === "string" ? x.taxId : null,
      address: typeof x.address === "string" ? x.address : null,
      email: typeof x.email === "string" ? x.email : null,
      phone: typeof x.phone === "string" ? x.phone : null,
    };
  };

  const amounts = (a: unknown) => {
    const x = (a && typeof a === "object" ? a : {}) as Record<string, unknown>;
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return {
      net: num(x.net),
      vat: num(x.vat),
      gross: num(x.gross),
      discount: num(x.discount),
    };
  };

  const lineItems = Array.isArray(o.lineItems)
    ? o.lineItems.map((row) => {
        const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
        const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
        return {
          name: typeof r.name === "string" ? r.name : "—",
          quantity: num(r.quantity),
          unit: typeof r.unit === "string" ? r.unit : null,
          unitPrice: num(r.unitPrice),
          vatRate: num(r.vatRate),
          netAmount: num(r.netAmount),
          grossAmount: num(r.grossAmount),
          lineTotal: num(r.lineTotal),
        };
      })
    : [];

  const lang = o.language;
  const language =
    lang === "pl" || lang === "en" || lang === "de" || lang === "fr" ? lang : "unknown";

  return {
    invoiceNumber: typeof o.invoiceNumber === "string" ? o.invoiceNumber : null,
    issueDate: parseDate(o.issueDate),
    saleDate: parseDate(o.saleDate),
    dueDate: parseDate(o.dueDate),
    paymentMethod: typeof o.paymentMethod === "string" ? o.paymentMethod : null,
    currency: typeof o.currency === "string" ? o.currency : null,
    amounts: amounts(o.amounts),
    taxRates: Array.isArray(o.taxRates)
      ? o.taxRates.filter((x): x is number => typeof x === "number")
      : [],
    seller: party(o.seller),
    buyer: party(o.buyer),
    bank: {
      account: typeof (o.bank as Record<string, unknown>)?.account === "string" ? (o.bank as Record<string, string>).account : null,
      iban: typeof (o.bank as Record<string, unknown>)?.iban === "string" ? (o.bank as Record<string, string>).iban : null,
      swift: typeof (o.bank as Record<string, unknown>)?.swift === "string" ? (o.bank as Record<string, string>).swift : null,
    },
    lineItems,
    documentType: typeof o.documentType === "string" ? o.documentType : null,
    notes: typeof o.notes === "string" ? o.notes : null,
    language,
    parsingConfidence:
      typeof o.parsingConfidence === "number" ? Math.round(o.parsingConfidence) : null,
    warnings: Array.isArray(o.warnings)
      ? o.warnings.filter((x): x is string => typeof x === "string")
      : [],
  };
}
