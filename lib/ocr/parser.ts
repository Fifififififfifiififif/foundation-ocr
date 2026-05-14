/** Heurystyki dla polskich faktur / dokumentów księgowych (tekst z OCR). */

import { parseFirstMoneyInSegment, parseMoneyToNumber } from "@/lib/format/money";

export type ParsedDocumentFields = {
  invoiceNumber: string | null;
  issueDate: Date | null;
  paymentDate: Date | null;
  amountNet: number | null;
  vatAmount: number | null;
  amountGross: number | null;
  nip: string | null;
  sellerName: string | null;
  /** Nabywca wg etykiety na dokumencie (nie mylić z rekordem kontrahenta w aplikacji) */
  buyerName: string | null;
  documentType: string | null;
  notes: string | null;
  bankAccount: string | null;
};

export function parseInvoiceFromText(text: string): ParsedDocumentFields {
  if (!text?.trim()) {
    return empty();
  }

  const t = text.replace(/\r\n/g, "\n");

  return {
    invoiceNumber: extractInvoiceNumber(t),
    issueDate: extractDate(t, ISSUE_DATE_LABELS),
    paymentDate: extractDate(t, PAYMENT_DATE_LABELS),
    amountNet: extractAmount(t, NET_LABELS),
    vatAmount: extractAmount(t, VAT_LABELS),
    amountGross: extractAmountGross(t),
    nip: extractNip(t),
    sellerName: extractSeller(t),
    buyerName: extractBuyer(t),
    documentType: extractDocumentType(t),
    notes: extractNotes(t),
    bankAccount: extractBankAccount(t),
  };
}

function empty(): ParsedDocumentFields {
  return {
    invoiceNumber: null,
    issueDate: null,
    paymentDate: null,
    amountNet: null,
    vatAmount: null,
    amountGross: null,
    nip: null,
    sellerName: null,
    buyerName: null,
    documentType: null,
    notes: null,
    bankAccount: null,
  };
}

function extractNotes(t: string): string | null {
  const blocks = [
    /(?:uwagi|uwaga)\s*[:\s]\s*([\s\S]{3,500}?)(?=\n\s*(?:NIP|VAT|razem|suma|podpis|dane\s+do)|\n{3,}|$)/i,
    /(?:notatki|komentarz)\s*[:\s]\s*([\s\S]{3,400}?)(?=\n\s*(?:NIP|VAT|razem)|\n{3,}|$)/i,
    /(?:pole\s+informacyjne|informacje\s+dodatkowe)\s*[:\s]\s*([\s\S]{3,400}?)(?=\n{3,}|$)/i,
  ];
  for (const re of blocks) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (m?.[1]) {
      const s = m[1].replace(/\s+/g, " ").trim();
      if (s.length >= 3 && s.length <= 800) return s;
    }
  }
  return null;
}

function extractDocumentType(t: string): string | null {
  const head = t.slice(0, 800).toLowerCase();

  if (/faktura\s+koryguj[aą]ca/i.test(head)) return "Faktura korygująca";
  if (/faktura\s+vat/i.test(head)) return "Faktura VAT";
  if (/faktura\s+bez\s+vat/i.test(head)) return "Faktura bez VAT";
  if (/faktura\s+oss/i.test(head)) return "Faktura OSS";
  if (/faktura\s+pro\s*forma|proforma/i.test(head)) return "Faktura proforma";
  if (/\brachunek\b/i.test(head) && !/faktura/i.test(head.slice(0, 120)))
    return "Rachunek";
  if (/paragon\s+fiskalny|\bfiskalny\b/i.test(head)) return "Paragon fiskalny";
  if (/\bparagon\b/i.test(head)) return "Paragon";
  if (/\bfaktura\b/i.test(head)) return "Faktura";
  if (/nota\s+obci[aą][żz]eniowa/i.test(head)) return "Nota obciążeniowa";
  if (/nota\s+uznaniowa/i.test(head)) return "Nota uznaniowa";
  return null;
}

function extractInvoiceNumber(t: string): string | null {
  const patterns = [
    /numer\s+faktury\s*[:\s#]*([A-Z0-9][A-Z0-9/\-. ]{2,})/gi,
    /nr\.?\s*faktury\s*[:\s#]*([A-Z0-9][A-Z0-9/\-. ]{2,})/gi,
    /numer\s+dokumentu\s*[:\s#]*([A-Z0-9][A-Z0-9/\-. ]{2,})/gi,
    /faktura\s+vat\s+nr\s+([A-Z0-9][A-Z0-9/\-. ]{3,})/gi,
    /(?:faktura\s*(?:vat)?|fv|rachunek)\s+(?:nr|numer)\s*[:\s#]*([A-Z0-9][A-Z0-9/\-. ]{3,})/gi,
    /(?:nr\s*(?:fv|faktury|dokumentu))\s*[:\s#]*([A-Z0-9][A-Z0-9/\-. ]{3,})/gi,
    /\b(FV[\s/\-]?\d[\d/\-]{4,})\b/gi,
    /\b(\d{1,6}\s*[/]\s*\d{1,4}\s*[/]\s*\d{2,6})\b/g,
    /\b(FA\s*\d[\d/\-]{4,})\b/gi,
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (m?.[1]) {
      const cleaned = m[1].replace(/\s+/g, "").replace(/[.,;]+$/, "").trim();
      if (cleaned.length >= 4) return cleaned;
    }
  }
  return null;
}

const ISSUE_DATE_LABELS = [
  /data\s+wystawienia/i,
  /data\s+faktury/i,
  /data\s+sprzeda[żz]y/i,
  /wystawion[aoey]/i,
  /issue\s*date/i,
  /date\s*of\s*issue/i,
];

const PAYMENT_DATE_LABELS = [
  /(?:termin|data)\s+p[łl]atno[śs]ci/i,
  /zap[łl]aci[ćc]\s+do/i,
  /termin\s+zap[łl]aty/i,
  /p[łl]atne\s+do/i,
  /due\s*date/i,
  /payment\s*date/i,
];

const DATE_RE = /(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/;

function extractDate(t: string, labels: RegExp[]): Date | null {
  for (const label of labels) {
    const labelRe = new RegExp(label.source + "\\s*:?\\s*" + DATE_RE.source, "im");
    const m = labelRe.exec(t);
    if (m?.[1]) {
      const d = parseFlexibleDate(m[1]);
      if (d) return d;
    }
  }

  for (const label of labels) {
    const idx = t.search(label);
    if (idx === -1) continue;
    const after = t.slice(idx, idx + 120);
    const m = DATE_RE.exec(after);
    if (m?.[1]) {
      const d = parseFlexibleDate(m[1]);
      if (d) return d;
    }
  }

  return null;
}

const NET_LABELS = [
  /(?:kwota|warto[śs][ćc])\s+netto/i,
  /(?:razem\s+)?netto/i,
  /warto[śs][ćc]\s+netto/i,
  /suma\s+netto/i,
  /net\s+(?:amount|total)/i,
];

const VAT_LABELS = [
  /(?:kwota|warto[śs][ćc])\s+(?:podatku\s+)?vat/i,
  /(?:kwota|warto[śs][ćc])\s+podatku/i,
  /(?:razem\s+)?vat/i,
  /podatek\s+vat/i,
  /kwota\s+vat/i,
];

const GROSS_LABELS = [
  /do\s+zap[łl]aty/i,
  /(?:razem\s+)?brutto/i,
  /warto[śs][ćc]\s+brutto/i,
  /suma\s+brutto/i,
  /(?:kwota\s+)?razem/i,
  /(?:gross|total)\s+(?:amount)?/i,
];

function extractAmount(t: string, labels: RegExp[]): number | null {
  for (const label of labels) {
    const combined = new RegExp(
      label.source + "\\s*:?\\s*([^\\n]{1,80})",
      "im",
    );
    const m = combined.exec(t);
    if (m?.[1]) {
      const n = parseFirstMoneyInSegment(m[1]);
      if (n != null && n > 0) return n;
    }
  }

  for (const label of labels) {
    const idx = t.search(label);
    if (idx === -1) continue;
    const after = t.slice(idx, idx + 100);
    const n = parseFirstMoneyInSegment(after);
    if (n != null && n > 0) return n;
  }

  return null;
}

function extractAmountGross(t: string): number | null {
  const fromLabels = extractAmount(t, GROSS_LABELS);
  if (fromLabels != null) return fromLabels;

  const currencyRe =
    /(?:PLN|zł|zl)\s*([\d\s]+(?:[.,]\d{2}))|([\d\s]+(?:[.,]\d{2}))\s*(?:PLN|zł|zl)/gi;
  const matches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = currencyRe.exec(t)) !== null) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const n = parseMoneyToNumber(raw);
    if (n != null && n > 0) matches.push(n);
  }
  return matches.length > 0 ? Math.max(...matches) : null;
}

function extractNip(t: string): string | null {
  const patterns = [
    /NIP\s*(?:sprzedawcy|wystawcy|dostawcy)\s*[:\s\-]*((?:\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|\d{10})\b/gi,
    /NIP\s*(?:nabywcy|kupuj[aą]cego)?\s*[:\s\-]*((?:\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|\d{10})\b/gi,
    /NIP\s*[:\s\-]*((?:\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2})|\d{10})\b/gi,
  ];

  for (const re of patterns) {
    re.lastIndex = 0;
    const m = re.exec(t);
    if (m?.[1]) {
      const cleaned = m[1].replace(/[\s-]/g, "");
      if (/^\d{10}$/.test(cleaned)) return cleaned;
    }
  }
  return null;
}

function extractSeller(t: string): string | null {
  return extractParty(t, [
    /sprzedawca\s*[:;]?\s*/i,
    /wystawca\s*[:;]?\s*/i,
    /dostawca\s*[:;]?\s*/i,
    /seller\s*[:;]?\s*/i,
  ]);
}

function extractBuyer(t: string): string | null {
  return extractParty(t, [/nabywca\s*[:;]?\s*/i, /kupuj[aą]cy\s*[:;]?\s*/i, /buyer\s*[:;]?\s*/i]);
}

function extractParty(t: string, labels: RegExp[]): string | null {
  const stopLine = /^(data|termin|nip|kwota|warto|podat|razem|do\s+zap|bank)/i;

  for (const label of labels) {
    const m = label.exec(t);
    if (!m) continue;
    const after = t.slice(m.index + m[0].length, m.index + m[0].length + 400);
    const lines = after.split("\n").map((l) => l.trim());
    const parts: string[] = [];
    for (const line of lines) {
      if (!line || stopLine.test(line) || /^NIP\s*[:\s]/i.test(line)) break;
      if (line.length >= 2 && line.length <= 120) parts.push(line);
      if (parts.length >= 1) break;
    }
    const joined = parts.join(", ").trim();
    if (joined.length >= 3 && joined.length <= 200) return joined;
  }
  return null;
}

function extractBankAccount(t: string): string | null {
  const compact = /\b(PL\d{2}(?:\s?\d{4}){6})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = compact.exec(t)) !== null) {
    const raw = m[1]!.replace(/\s/g, "").toUpperCase();
    if (/^PL\d{26}$/.test(raw)) return raw;
  }
  const labeled =
    /(?:nr\.?\s*konta|numer\s+konta|rachunek)\s*[:\s#]*([A-Z]{2}[\d\s]{12,40})/gi.exec(
      t,
    );
  if (labeled?.[1]) {
    const raw = labeled[1].replace(/\s/g, "").toUpperCase();
    if (/^PL\d{26}$/.test(raw)) return raw;
  }
  return null;
}

function parseFlexibleDate(s: string): Date | null {
  const trimmed = s.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/.exec(trimmed);
  if (!dmy) return null;

  let day = Number(dmy[1]);
  let month = Number(dmy[2]);
  let year = Number(dmy[3]);
  if (year < 100) year += 2000;

  if (month > 12 && day <= 12) {
    [day, month] = [month, day];
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const d = new Date(year, month - 1, day, 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}
