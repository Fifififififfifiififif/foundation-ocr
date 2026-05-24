import type { PSM } from "tesseract.js";

import { withTesseractWorker } from "@/lib/ocr/tesseract-worker";

export type RecognizeResult = {
  text: string;
  confidence: number;
};

/**
 * Jedno rozpoznanie Tesseract z podanym PSM (bez multi-pass).
 */
export async function recognizeWithTesseract(
  imageBuffer: Buffer,
  languages: string,
  psm: PSM,
): Promise<RecognizeResult> {
  return withTesseractWorker(languages, async (worker) => {
    await worker.setParameters({
      tessedit_pageseg_mode: psm,
      preserve_interword_spaces: "1",
    });
    const {
      data: { text, confidence },
    } = await worker.recognize(imageBuffer);
    return {
      text: text ?? "",
      confidence: typeof confidence === "number" && Number.isFinite(confidence) ? confidence : 0,
    };
  });
}
