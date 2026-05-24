import { ALLOWED_MIME_TYPES } from "@/lib/constants";

import type { OcrRuntimeConfig } from "./config";
import { getOcrRuntimeConfig } from "./config";
import { describeOcrFailure } from "./errors";
import { extractPdfText } from "./pdf";
import { extractImageText } from "./tesseract";

export type OcrEngineSource = "tesseract" | "pdf-text" | "tesseract-pdf";

export type OcrRunResult = {
  text: string;
  /** Średnia pewność Tesseract (0–100); null dla PDF z warstwą tekstową */
  meanConfidence: number | null;
  engine: OcrEngineSource;
  languages: string;
};

export type OcrRunOptions = Partial<OcrRuntimeConfig>;

/**
 * Pełny pipeline OCR:
 * - obrazy → preprocess + Tesseract (pol+eng domyślnie)
 * - PDF → pdf-parse, a przy skanie fallback Tesseract na stronach
 */
export async function runOcr(
  buffer: Buffer,
  mimeType: string,
  options?: OcrRunOptions,
): Promise<OcrRunResult> {
  const config = getOcrRuntimeConfig(options);

  if (!buffer?.length) {
    throw new Error("Brak pliku.");
  }
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Nieobsługiwany format pliku dla OCR.");
  }

  try {
    if (mimeType === "application/pdf") {
      const pdf = await extractPdfText(buffer, config);
      return {
        text: pdf.text,
        meanConfidence: pdf.meanConfidence,
        engine: pdf.source,
        languages: config.languages,
      };
    }

    const { text, confidence, languages } = await extractImageText(buffer, config, mimeType);
    return {
      text,
      meanConfidence: confidence,
      engine: "tesseract",
      languages,
    };
  } catch (e: unknown) {
    if (e instanceof Error) {
      const m = e.message.trim();
      if (m) throw e;
    }
    throw new Error(describeOcrFailure(e));
  }
}
