import { parseFirstMoneyInSegment, parseMoneyToNumber } from "@/lib/format/money";

const DATE_TOKEN = /(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}|\d{4}-\d{2}-\d{2})/;

export function parseFlexibleDate(s: string): Date | null {
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
  if (month > 12 && day <= 12) [day, month] = [month, day];
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day, 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function extractDateNearLabel(text: string, labels: RegExp[]): Date | null {
  for (const label of labels) {
    const combined = new RegExp(label.source + "\\s*:?\\s*" + DATE_TOKEN.source, "im");
    const m = combined.exec(text);
    if (m?.[1]) {
      const d = parseFlexibleDate(m[1]);
      if (d) return d;
    }
  }
  for (const label of labels) {
    const idx = text.search(label);
    if (idx === -1) continue;
    const window = text.slice(idx, idx + 140);
    const m = DATE_TOKEN.exec(window);
    if (m?.[1]) {
      const d = parseFlexibleDate(m[1]);
      if (d) return d;
    }
  }
  return null;
}

export function extractMoneyNearLabel(text: string, labels: RegExp[]): number | null {
  for (const label of labels) {
    const combined = new RegExp(label.source + "\\s*:?\\s*([^\\n]{1,100})", "im");
    const m = combined.exec(text);
    if (m?.[1]) {
      const n = parseFirstMoneyInSegment(m[1]);
      if (n != null && n >= 0) return n;
    }
  }
  for (const label of labels) {
    const idx = text.search(label);
    if (idx === -1) continue;
    const n = parseFirstMoneyInSegment(text.slice(idx, idx + 120));
    if (n != null && n >= 0) return n;
  }
  return null;
}

export function extractLabeledValue(text: string, labels: RegExp[], maxLen = 120): string | null {
  for (const label of labels) {
    const re = new RegExp(label.source + "\\s*:?\\s*([^\\n]{1," + maxLen + "})", "im");
    const m = re.exec(text);
    if (m?.[1]) {
      const v = m[1].trim();
      if (v.length >= 2) return v;
    }
  }
  return null;
}

export type PartyColumnSlice = {
  name: string | null;
  taxId: string | null;
  block: string | null;
};

/** Dwie kolumny Sprzedawca | Nabywca w jednym wierszu nagłówka (typowe polskie faktury). */
export function extractPartiesFromColumns(text: string): {
  seller: PartyColumnSlice;
  buyer: PartyColumnSlice;
} | null {
  const headerRe = /(?:^|\n)\s*(?:sprzedawca\s+nabywca|seller\s+buyer|verk[aä]ufer\s+k[aä]ufer)\s*(?:\n|$)/im;
  const headerMatch = headerRe.exec(text);
  if (!headerMatch) return null;

  const block = text.slice(headerMatch.index + headerMatch[0].length, headerMatch.index + headerMatch[0].length + 900);
  const rawLines = block.split("\n").map((l) => l.trim());
  const stopRe =
    /^(data|termin|nip|vat|kwota|warto|podat|razem|do\s+zap|bank|iban|swift|invoice|faktura|total|suma|lp\b|sposób)/i;

  const dataLines: string[] = [];
  const dualNipLine = /(?:NIP|Nir|VAT)\s*[:\s#\-]*[0-9A-Z].*\s+(?:NIP|Nir|VAT)/i;
  for (const line of rawLines) {
    if (!line) continue;
    if (stopRe.test(line) && !dualNipLine.test(line)) break;
    if (line.length >= 2 && line.length <= 200) dataLines.push(line);
    if (dataLines.length >= 5) break;
  }
  if (dataLines.length === 0) return null;

  const splitLine = (line: string): [string, string] => {
    const byGap = line.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
    if (byGap.length >= 2) {
      return [byGap[0]!, byGap.slice(1).join(" ")];
    }
    const mid = Math.floor(line.length / 2);
    return [line.slice(0, mid).trim(), line.slice(mid).trim()];
  };

  const sellerParts: string[] = [];
  const buyerParts: string[] = [];
  let sellerTax: string | null = null;
  let buyerTax: string | null = null;

  for (const line of dataLines) {
    const nipPair =
      /(?:NIP|Nir|VAT)\s*:?\s*([0-9][0-9A-Z\s\-]{7,18}[0-9])\s+(?:NIP|Nir|VAT)\s*:?\s*([0-9][0-9A-Z\s\-]{7,18}[0-9])/i.exec(
        line,
      );
    if (nipPair) {
      sellerTax = normalizeTaxId(nipPair[1] ?? "");
      buyerTax = normalizeTaxId(nipPair[2] ?? "");
      continue;
    }
    const [left, right] = splitLine(line);
    if (left.length >= 2) sellerParts.push(left);
    if (right.length >= 2) buyerParts.push(right);
  }

  const sellerName = sanitizePartyName(sellerParts[0] ?? null);
  const buyerName = sanitizePartyName(buyerParts[0] ?? null);
  if (!sellerName && !buyerName && !sellerTax && !buyerTax) return null;

  return {
    seller: {
      name: sellerName,
      taxId: sellerTax,
      block: sellerParts.join(", ") || null,
    },
    buyer: {
      name: buyerName,
      taxId: buyerTax,
      block: buyerParts.join(", ") || null,
    },
  };
}

/** Fragment tekstu od etykiety strony (np. Sprzedawca) do etykiety drugiej strony (np. Nabywca). */
export function extractPartySection(
  text: string,
  startLabels: RegExp[],
  endBeforeLabels: RegExp[] = [],
): string | null {
  for (const label of startLabels) {
    const m = label.exec(text);
    if (!m) continue;
    const lineEnd = text.indexOf("\n", m.index);
    const lineSlice = text.slice(m.index, lineEnd === -1 ? text.length : lineEnd);
    /** Nagłówek kolumn „Sprzedawca Nabywca” — NIP-y obsługuje extractPartiesFromColumns. */
    const isDualColumnHeader =
      endBeforeLabels.length > 0 &&
      startLabels.some((sl) => sl.test(lineSlice)) &&
      endBeforeLabels.some((el) => el.test(lineSlice));
    if (isDualColumnHeader) continue;

    const start = m.index + m[0].length;
    let end = Math.min(text.length, start + 700);
    for (const endLabel of endBeforeLabels) {
      const em = endLabel.exec(text.slice(start));
      if (em?.index != null && em.index >= 0) {
        end = Math.min(end, start + em.index);
      }
    }
    const section = text.slice(start, end).trim();
    if (section.length >= 2) return section;
  }
  return null;
}

/** NIP / VAT ID tylko z bloku danej strony (sprzedawca lub nabywca). */
export function extractTaxIdFromPartySection(
  text: string,
  startLabels: RegExp[],
  endBeforeLabels: RegExp[] = [],
): string | null {
  const section = extractPartySection(text, startLabels, endBeforeLabels);
  if (!section) return null;
  const nipRe =
    /(?:NIP|Nir|VAT(?:\s*ID)?|UID)\s*[:\s#\-]*((?:PL\s*)?(?:\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10}|[A-Z]{2}\d{8,12}))/i;
  const m = nipRe.exec(section);
  if (m?.[1]) {
    const n = normalizeTaxId(m[1]);
    if (n) return n;
  }
  const dual = /(?:NIP|Nir)\s*([0-9A-ZPL\s\-]{8,24})\s+(?:NIP|Nir)\s*([0-9A-ZPL\s\-]{8,24})/i.exec(section);
  if (dual?.[1]) {
    const n = normalizeTaxId(dual[1]);
    if (n) return n;
  }
  return null;
}

export function extractPartyBlock(text: string, labels: RegExp[]): string | null {
  const stopLine =
    /^(data|termin|nip|vat|kwota|warto|podat|razem|do\s+zap|bank|iban|swift|invoice|faktura|total|suma|lp\b)/i;

  for (const label of labels) {
    const m = label.exec(text);
    if (!m) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 500);
    const lines = after.split("\n").map((l) => l.trim());
    const parts: string[] = [];
    for (const line of lines) {
      if (!line || stopLine.test(line)) break;
      if (/^(NIP|VAT|UID|UST|PL)\s*[:\s]/i.test(line)) break;
      if (line.length >= 2 && line.length <= 160) parts.push(line);
      if (parts.length >= 3) break;
    }
    const joined = parts.join(", ").trim();
    if (joined.length >= 3 && joined.length <= 240) return joined;
  }
  return null;
}

export function sanitizePartyName(name: string | null): string | null {
  if (!name) return null;
  const cleaned = name
    .replace(/\s*[=|¦]+\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^["'„]+|["'„]+$/g, "")
    .trim();
  return cleaned.length >= 2 ? cleaned.slice(0, 160) : null;
}

export function normalizeTaxId(raw: string | null): string | null {
  if (!raw) return null;
  const t = raw.trim().toUpperCase();
  const pl = /(?:PL)?\s*(\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10})/.exec(t);
  if (pl?.[1]) {
    const d = pl[1].replace(/[\s-]/g, "");
    if (/^\d{10}$/.test(d)) return d;
  }
  const eu = /\b([A-Z]{2}\d{8,12})\b/.exec(t.replace(/\s/g, ""));
  if (eu?.[1]) return eu[1];
  const digits = t.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  return null;
}

export function extractTaxIdNearLabel(text: string, labels: RegExp[]): string | null {
  for (const label of labels) {
    const re = new RegExp(
      label.source + "\\s*:?\\s*((?:PL\\s*)?(?:\\d{3}[\\s-]?){2}\\d{2}[\\s-]?\\d{2}|\\d{10}|[A-Z]{2}\\d{8,12})",
      "im",
    );
    const m = re.exec(text);
    if (m?.[1]) {
      const n = normalizeTaxId(m[1]);
      if (n) return n;
    }
  }
  return null;
}

export function extractAllTaxIds(text: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /NIP\s*(?:sprzedawcy|wystawcy|dostawcy|nabywcy|kupuj[aą]cego)?\s*[:\s\-]*((?:PL\s*)?(?:\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}|\d{10}))/gi,
    /VAT\s*(?:ID|NO)?\s*[:\s#]*([A-Z]{2}\s?\d{8,12})/gi,
    /\b(PL\s?\d{10})\b/gi,
    /\b(\d{3}[\s-]\d{3}[\s-]\d{2}[\s-]\d{2})\b/g,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = normalizeTaxId(m[1] ?? "");
      if (n) found.add(n);
    }
  }
  return [...found];
}

export function extractIban(text: string): string | null {
  const ibanRe = /\b([A-Z]{2}\d{2}(?:\s?\d{4}){2,7}\d{0,4})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = ibanRe.exec(text)) !== null) {
    const raw = m[1]!.replace(/\s/g, "").toUpperCase();
    if (raw.length >= 15 && raw.length <= 34) return raw;
  }
  return null;
}

export function extractSwift(text: string): string | null {
  const m = /\b(?:SWIFT|BIC)\s*[:\s#]*([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/i.exec(text);
  if (m?.[1]) return m[1].toUpperCase();
  const loose = /\b([A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?)\b/.exec(text);
  if (loose?.[1] && /SWIFT|BIC|BANK/i.test(text.slice(Math.max(0, (loose.index ?? 0) - 40), (loose.index ?? 0) + 20))) {
    return loose[1].toUpperCase();
  }
  return null;
}

export function extractCurrency(text: string): string | null {
  const m =
    /\b(PLN|EUR|USD|GBP|CHF|CZK)\b/i.exec(text) ||
    /(?:kwota|total|razem)[^\n]{0,40}\b(zł|zl)\b/i.exec(text);
  if (!m?.[1]) return null;
  const c = m[1].toUpperCase().replace("ZŁ", "PLN").replace("ZL", "PLN");
  return c;
}

export function extractLargestMoneyAmount(text: string): number | null {
  const currencyRe =
    /(?:PLN|EUR|USD|zł|zl)\s*([\d\s]+(?:[.,]\d{2}))|([\d\s]+(?:[.,]\d{2}))\s*(?:PLN|EUR|USD|zł|zl)/gi;
  const matches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = currencyRe.exec(text)) !== null) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const n = parseMoneyToNumber(raw);
    if (n != null && n > 0) matches.push(n);
  }
  return matches.length > 0 ? Math.max(...matches) : null;
}

export function detectLanguage(text: string): "pl" | "en" | "de" | "fr" | "unknown" {
  const lower = text.toLowerCase();
  const scores = {
    pl: (lower.match(/\b(faktura|nip|brutto|netto|sprzedawca|nabywca|zł|vat)\b/g) ?? []).length,
    en: (lower.match(/\b(invoice|total|due date|seller|buyer|gross|net|tax)\b/g) ?? []).length,
    de: (lower.match(/\b(rechnung|mwst|netto|brutto|verk[aä]ufer|k[aä]ufer)\b/g) ?? []).length,
    fr: (lower.match(/\b(facture|tva|ttc|ht|fournisseur|client)\b/g) ?? []).length,
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (!best || best[1] < 2) return "unknown";
  return best[0] as "pl" | "en" | "de" | "fr";
}

export function extractEmail(text: string): string | null {
  const m = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.exec(text);
  return m?.[0] ?? null;
}

export function extractPhone(text: string): string | null {
  const m = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,3}\)?[\s-]?)?\d{3}[\s-]?\d{2,3}[\s-]?\d{2,3}/.exec(text);
  return m?.[0]?.trim() ?? null;
}
