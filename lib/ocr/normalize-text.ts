import { repairOcrText } from "@/lib/ocr/ocr-corrections";

/** Normalizacja tekstu OCR przed parsowaniem. */
export function normalizeOcrText(raw: string): string {
  if (!raw?.trim()) return "";

  let t = repairOcrText(raw);
  t = t.replace(/[\u2013\u2014]/g, "-");
  t = t.replace(/[''‚']/g, "'");
  t = t.replace(/\t+/g, " ");
  t = t.replace(/[|¦](?=[a-z])/gi, "l");
  t = t.replace(/\s*=\s*$/gm, "");

  const lines = t.split("\n").map((line) => {
    let l = line.replace(/\s{2,}/g, " ").trim();
    l = l.replace(/(\d)\s+([.,])\s+(\d)/g, "$1$2$3");
    l = l.replace(/(\d)\s+(\d{3})\s+([.,]\d{2})/g, "$1 $2$3");
    l = l.replace(/([A-Z0-9]{2,})\s*\.\s*([A-Z]{2,})/g, "$1.$2");
    return l;
  });

  return lines.join("\n").trim();
}

export function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
