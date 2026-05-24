import type { DocumentClass } from "@/lib/ocr/document-classify";
import type { PreprocessProfileId } from "@/lib/ocr/preprocess-profiles";

import { PSM } from "tesseract.js";

/** Tesseract PSM (pageseg_mode) — wartości numeryczne API. */
export const TESSERACT_PSM = {
  OSD_ONLY: PSM.OSD_ONLY,
  AUTO_OSD: PSM.AUTO_OSD,
  AUTO: PSM.AUTO,
  SINGLE_COLUMN: PSM.SINGLE_COLUMN,
  SINGLE_BLOCK: PSM.SINGLE_BLOCK,
  SINGLE_LINE: PSM.SINGLE_LINE,
  SINGLE_WORD: PSM.SINGLE_WORD,
  SPARSE_TEXT: PSM.SPARSE_TEXT,
  SPARSE_TEXT_OSD: PSM.SPARSE_TEXT_OSD,
} as const;

export type OcrPassStrategy = {
  profileId: PreprocessProfileId;
  psm: PSM;
  label: string;
};

export function buildOcrPassStrategies(
  docClass: DocumentClass,
  profileIds: PreprocessProfileId[],
  maxPasses: number,
): OcrPassStrategy[] {
  const psmSets: Record<DocumentClass, PSM[]> = {
    invoice: [TESSERACT_PSM.SINGLE_BLOCK, TESSERACT_PSM.AUTO, TESSERACT_PSM.SINGLE_COLUMN],
    tabular: [TESSERACT_PSM.SINGLE_BLOCK, TESSERACT_PSM.SINGLE_COLUMN, TESSERACT_PSM.AUTO],
    receipt: [TESSERACT_PSM.SINGLE_BLOCK, TESSERACT_PSM.SPARSE_TEXT],
    form: [TESSERACT_PSM.AUTO, TESSERACT_PSM.SINGLE_BLOCK],
    generic_text: [TESSERACT_PSM.AUTO, TESSERACT_PSM.SINGLE_BLOCK],
    unknown: [TESSERACT_PSM.AUTO, TESSERACT_PSM.SINGLE_BLOCK],
  };

  const psms = psmSets[docClass] ?? psmSets.unknown;
  const strategies: OcrPassStrategy[] = [];

  for (const profileId of profileIds) {
    for (const psm of psms) {
      strategies.push({
        profileId,
        psm,
        label: `${profileId}/PSM${psm}`,
      });
      if (strategies.length >= maxPasses) return strategies;
    }
  }

  return strategies.slice(0, maxPasses);
}
