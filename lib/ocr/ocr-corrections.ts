/** Korekcje typowych pomyłek OCR w kontekście (nie globalne zamiany). */

const DIGIT_CONFUSIONS: Record<string, string> = {
  O: "0",
  o: "0",
  D: "0",
  Q: "0",
  I: "1",
  l: "1",
  "|": "1",
  S: "5",
  s: "5",
  B: "8",
  Z: "2",
  z: "2",
  G: "6",
  g: "9",
};

function fixDigitString(s: string): string {
  let out = "";
  for (const ch of s) {
    out += DIGIT_CONFUSIONS[ch] ?? ch;
  }
  return out;
}

function fixPolishNipInText(text: string): string {
  return text.replace(
    /(?:NIP|Nir|Nr\s*NIP)\s*[:\s]*([0-9OIlSBZ\s\-]{8,14})/gi,
    (match, raw: string, offset: number, full: string) => {
      const lineStart = full.lastIndexOf("\n", offset) + 1;
      const lineEnd = full.indexOf("\n", offset);
      const line = full.slice(lineStart, lineEnd === -1 ? full.length : lineEnd);
      /** Wiersz kolumnowy z dwoma NIP — zostaw bez formatowania z myślnikami (parsowanie Sprzedawca|Nabywca). */
      if ((line.match(/\b(?:NIP|Nir)\b/gi) ?? []).length >= 2) return match;

      const digits = fixDigitString(raw).replace(/\D/g, "");
      if (digits.length !== 10) return match;
      const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 8)}-${digits.slice(8, 10)}`;
      return `NIP: ${formatted}`;
    },
  );
}

function fixIbanInText(text: string): string {
  return text.replace(/\b([A-Z]{2})\s*([O0Il]{2})\s*([A-Z0-9\s]{10,34})\b/gi, (_m, cc: string, check: string, rest: string) => {
    const fixedCheck = fixDigitString(check);
    const body = fixDigitString(rest).replace(/\s/g, "").toUpperCase();
    const merged = `${cc}${fixedCheck}${body}`.replace(/[^A-Z0-9]/g, "");
    if (merged.length < 15) return _m;
    return merged.replace(/(.{4})/g, "$1 ").trim();
  });
}

function fixInvoiceNumberTokens(text: string): string {
  return text.replace(
    /\b(nr|numer)\s*[:\s#]*([A-Z0-9OIlSBZ/.\-]{2,32})/gi,
    (_m, label: string, num: string) => {
      let cleaned = num.replace(/[=]+$/g, "").replace(/[=\u2013\u2014]/g, "").trim();
      cleaned = cleaned.replace(/\s+(sprzedawca|nabywca|seller|buyer).*$/i, "");
      const fixed = cleaned
        .replace(/(?<=[A-Z/])O(?=[0-9/])/gi, "0")
        .replace(/(?<=\d)O(?=\d)/g, "0");
      return `${label}: ${fixed}`;
    },
  );
}

function fixAmountLines(text: string): string {
  return text.replace(
    /^(\s*\b(?:razem|brutto|gross|total|do\s+zap|wartość|subtotal|netto|vat\s+amount|kwota\s+netto|podatek\s+vat)\b\s*[^\d]{0,24})(\d[\dOIlSBZ\s.,]*)/gim,
    (_m, prefix: string, amount: string) => {
      const fixed = fixDigitString(amount).replace(/\s+([.,])/g, "$1");
      return prefix + fixed;
    },
  );
}

/**
 * Naprawia tekst OCR przed parsowaniem — kontekstowe korekcje ID, IBAN, kwot.
 */
export function repairOcrText(raw: string): string {
  if (!raw?.trim()) return "";

  let t = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  t = t.replace(/\u00a0/g, " ");
  t = t.replace(/[""„"]/g, '"');
  t = fixPolishNipInText(t);
  t = fixIbanInText(t);
  t = fixInvoiceNumberTokens(t);
  t = fixAmountLines(t);
  t = t.replace(/\s*=\s*$/gm, "");
  return t;
}
