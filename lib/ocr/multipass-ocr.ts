import type { OcrRuntimeConfig } from "@/lib/ocr/config";
import { getOcrRuntimeConfig } from "@/lib/ocr/config";
import {
  classifyFromText,
  defaultPreOcrClass,
  type DocumentClass,
} from "@/lib/ocr/document-classify";
import { repairOcrText } from "@/lib/ocr/ocr-corrections";
import { pickBestOcrCandidate } from "@/lib/ocr/ocr-score";
import {
  profilesForDocumentClass,
  renderPreprocessProfile,
  type PreprocessProfileId,
} from "@/lib/ocr/preprocess-profiles";
import { buildOcrPassStrategies, TESSERACT_PSM, type OcrPassStrategy } from "@/lib/ocr/tesseract-psm";
import { recognizeWithTesseract } from "@/lib/ocr/tesseract-recognize";
import { withOcrTimeout } from "@/lib/ocr/timeout";

export type MultiPassOcrResult = {
  text: string;
  confidence: number;
  languages: string;
  passLabel: string;
  passesRun: number;
  documentClass: DocumentClass;
};

type PassCandidate = {
  text: string;
  confidence: number;
  passLabel: string;
};

function normalizeOcrText(text: string | null | undefined): string {
  return repairOcrText((text ?? "").replace(/\r\n/g, "\n").trim());
}

function parseConfidence(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function resolveLanguages(config: OcrRuntimeConfig, hint: string | null): string {
  if (hint?.trim()) return hint.trim();
  return config.languages;
}

async function runSinglePass(
  buffer: Buffer,
  strategy: OcrPassStrategy,
  languages: string,
  preprocessEnabled: boolean,
): Promise<PassCandidate | null> {
  let image = buffer;
  if (preprocessEnabled) {
    try {
      image = await renderPreprocessProfile(buffer, strategy.profileId);
    } catch {
      return null;
    }
  }

  try {
    const { text, confidence } = await recognizeWithTesseract(image, languages, strategy.psm);
    const out = normalizeOcrText(text);
    if (!out) return null;
    return {
      text: out,
      confidence: parseConfidence(confidence),
      passLabel: strategy.label,
    };
  } catch {
    return null;
  }
}

/**
 * Multi-pass OCR: wiele profili preprocessingu × PSM, wybór najlepszego wyniku.
 */
export async function runMultiPassImageOcr(
  buffer: Buffer,
  config: OcrRuntimeConfig = getOcrRuntimeConfig(),
  mimeType = "image/png",
): Promise<MultiPassOcrResult> {
  if (!buffer?.length) throw new Error("Brak pliku.");

  const preClass = defaultPreOcrClass(mimeType);
  let docClass = preClass.documentClass;
  let languages = resolveLanguages(config, preClass.languageHint);

  const profileIds = profilesForDocumentClass(docClass);
  const strategies = buildOcrPassStrategies(docClass, profileIds, config.maxOcrPasses);

  const runAll = async () => {
    const candidates: PassCandidate[] = [];

    for (const strategy of strategies) {
      const result = await runSinglePass(buffer, strategy, languages, config.preprocess);
      if (result) candidates.push(result);
    }

    if (!candidates.length) {
      const fallback = await runSinglePass(
        buffer,
        {
          profileId: "flat_grayscale" as PreprocessProfileId,
          psm: TESSERACT_PSM.AUTO,
          label: "fallback/raw",
        },
        languages,
        false,
      );
      if (fallback) candidates.push(fallback);
    }

    if (!candidates.length) {
      throw new Error("OCR nie mogło odczytać dokumentu — brak rozpoznanego tekstu.");
    }

    const best = pickBestOcrCandidate(candidates, docClass);
    const classified = classifyFromText(best.text);
    docClass = classified.documentClass;

    if (classified.languageHint && classified.confidence > 0.7) {
      languages = resolveLanguages(config, classified.languageHint);
    }

    return {
      text: best.text,
      confidence: best.confidence,
      languages,
      passLabel: best.passLabel,
      passesRun: candidates.length,
      documentClass: docClass,
    };
  };

  try {
    return await withOcrTimeout(runAll(), config.timeoutMs, "OCR wieloprzebiegowe");
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("OCR nie mogło")) throw e;
    const detail = e instanceof Error ? e.message : String(e);
    if (/timeout|przekroczyło limit/i.test(detail)) throw e;
    throw new Error(`Błąd OCR (multi-pass): ${detail}`);
  }
}
