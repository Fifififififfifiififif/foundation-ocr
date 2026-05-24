/**
 * Polish-centric money parsing and display (PLN / zł).
 */

const CURRENCY_NOISE = /(PLN|zł|zl|ZŁ|EUR|USD)/gi;

/**
 * Parse amounts like: 1234,56 · 1 234,56 · 1234.56 · 1.234,56 · PLN 1234,56 · zł 1 234,56
 * Returns major currency units as a number, or null if not parseable.
 */
export function parseMoneyToNumber(raw: string): number | null {
  if (!raw?.trim()) return null;
  let s = raw.replace(CURRENCY_NOISE, " ").replace(/\u00a0/g, " ").trim();
  s = s.replace(/\s+/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Ostatni separator dziesiętny: przecinek (EU 1.234,56) lub kropka (US/UK 1,234.56)
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  const n = Number.parseFloat(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** First money-like token in a line (after optional currency prefix). */
export function parseFirstMoneyInSegment(segment: string): number | null {
  const cleaned = segment.replace(CURRENCY_NOISE, " ").replace(/\u00a0/g, " ");
  const candidates: number[] = [];
  const re = /(?:\d{1,3}(?:[.,\s]\d{3})+|\d+)\s*[.,]\s*\d{2}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const n = parseMoneyToNumber(m[0]);
    if (n != null && n > 0 && n < 1e12) candidates.push(n);
  }
  if (candidates.length) return Math.max(...candidates);
  const loose = cleaned.match(/\d+[.,]\d{1,2}/);
  if (loose) {
    const n = parseMoneyToNumber(loose[0]);
    if (n != null && n > 0) return n;
  }
  return null;
}

/** Display as e.g. "1 234,56 zł" */
export function formatMoneyPl(amount: number): string {
  const formatted = new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${formatted} zł`;
}
