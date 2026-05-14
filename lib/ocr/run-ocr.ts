import { ALLOWED_MIME_TYPES } from "@/lib/constants";

import { describeOcrFailure } from "./errors";
import { extractPdfText } from "./pdf";
import { extractImageText } from "./tesseract";

export type OcrRunResult = {
  text: string;
  /** Średnia pewność (0–100) dla obrazów; null dla PDF z warstwą tekstu */
  meanConfidence: number | null;
};

/**
 * Pełny pipeline OCR: PDF (pdf-parse) lub obraz (Tesseract, pol+eng).
 */
export async function runOcr(buffer: Buffer, mimeType: string): Promise<OcrRunResult> {
  if (!buffer?.length) {
    throw new Error("Brak pliku.");
  }
  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Nieobsługiwany format pliku dla OCR.");
  }

  try {
    if (mimeType === "application/pdf") {
      const text = await extractPdfText(buffer);
      return { text, meanConfidence: null };
    }
    const { text, confidence } = await extractImageText(buffer);
    return { text, meanConfidence: confidence };
  } catch (e: unknown) {
    if (e instanceof Error) {
      const m = e.message.trim();
      if (m) throw e;
    }
    throw new Error(describeOcrFailure(e));
  }
}
