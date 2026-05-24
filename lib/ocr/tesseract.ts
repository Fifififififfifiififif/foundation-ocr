import type { OcrRuntimeConfig } from "@/lib/ocr/config";
import { getOcrRuntimeConfig } from "@/lib/ocr/config";
import { runMultiPassImageOcr } from "@/lib/ocr/multipass-ocr";
import { repairOcrText } from "@/lib/ocr/ocr-corrections";
import { preprocessImageForOcr } from "@/lib/ocr/preprocess";
import { recognizeWithTesseract } from "@/lib/ocr/tesseract-recognize";
import { TESSERACT_PSM } from "@/lib/ocr/tesseract-psm";
import { withOcrTimeout } from "@/lib/ocr/timeout";

export type TesseractExtractResult = {
  text: string;
  confidence: number;
  languages: string;
  /** Etykieta wybranego przebiegu (multi-pass) */
  passLabel?: string;
};

function normalizeOcrText(text: string | null | undefined): string {
  return repairOcrText((text ?? "").replace(/\r\n/g, "\n").trim());
}

function parseConfidence(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

async function extractImageTextSinglePass(
  buffer: Buffer,
  config: OcrRuntimeConfig,
): Promise<TesseractExtractResult> {
  const prepared = await preprocessImageForOcr(buffer, { enabled: config.preprocess });
  const { text, confidence } = await recognizeWithTesseract(
    prepared,
    config.languages,
    TESSERACT_PSM.SINGLE_BLOCK,
  );
  const out = normalizeOcrText(text);
  if (!out) {
    throw new Error("OCR nie mogło odczytać dokumentu — brak rozpoznanego tekstu.");
  }
  return {
    text: out,
    confidence: parseConfidence(confidence),
    languages: config.languages,
    passLabel: "single/PSM6",
  };
}

/**
 * OCR obrazów — multi-pass (domyślnie) lub pojedynczy przebieg.
 */
export async function extractImageText(
  buffer: Buffer,
  config: OcrRuntimeConfig = getOcrRuntimeConfig(),
  mimeType = "image/jpeg",
): Promise<TesseractExtractResult> {
  if (!buffer?.length) {
    throw new Error("Brak pliku.");
  }

  const run = async () => {
    if (config.multiPass) {
      const mp = await runMultiPassImageOcr(buffer, config, mimeType);
      return {
        text: mp.text,
        confidence: mp.confidence,
        languages: mp.languages,
        passLabel: mp.passLabel,
      };
    }
    return extractImageTextSinglePass(buffer, config);
  };

  try {
    return await withOcrTimeout(run(), config.timeoutMs, "OCR obrazu");
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("OCR nie mogło")) throw e;
    const detail = e instanceof Error ? e.message : String(e);
    if (/timeout|przekroczyło limit/i.test(detail)) throw e;
    throw new Error(`Błąd OCR (Tesseract): ${detail}`);
  }
}

/** OCR wielu stron (np. skan PDF) — łączy tekst z podziałem na strony. */
export async function extractMultiPageImageText(
  pageBuffers: Buffer[],
  config: OcrRuntimeConfig = getOcrRuntimeConfig(),
): Promise<TesseractExtractResult> {
  if (!pageBuffers.length) {
    throw new Error("Brak stron do OCR.");
  }

  const parts: string[] = [];
  let confidenceSum = 0;

  for (let i = 0; i < pageBuffers.length; i += 1) {
    const page = await extractImageText(pageBuffers[i]!, config, "image/png");
    parts.push(`--- Strona ${i + 1} ---\n${page.text}`);
    confidenceSum += page.confidence;
  }

  const merged = parts.join("\n\n").trim();
  if (!merged) {
    throw new Error("OCR nie mogło odczytać dokumentu — brak rozpoznanego tekstu.");
  }

  return {
    text: merged,
    confidence: confidenceSum / pageBuffers.length,
    languages: config.languages,
    passLabel: "multipage",
  };
}
