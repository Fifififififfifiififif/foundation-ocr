/** Domyślne języki Tesseract (ISO 639-2/3, format tesseract.js: pol+eng+deu+fra). */
export const DEFAULT_OCR_LANGUAGES = "pol+eng+deu+fra";

/** Maks. czas jednego przebiegu OCR (ms). */
export const DEFAULT_OCR_TIMEOUT_MS = 240_000;

/** Domyślna liczba przebiegów multi-pass (profile × PSM). */
export const DEFAULT_OCR_MAX_PASSES = 12;

/** Po ilu rozpoznaniach zresetować workera (unikaj wycieków pamięci). */
export const OCR_WORKER_MAX_USES = 40;

/** Maks. stron PDF renderowanych do OCR (skany). */
export const DEFAULT_OCR_PDF_MAX_PAGES = 5;

/** Domyślna skala renderu stron PDF (wyższa = lepsza jakość OCR). */
export const DEFAULT_OCR_PDF_RENDER_SCALE = 3;

export type OcrRuntimeConfig = {
  languages: string;
  timeoutMs: number;
  preprocess: boolean;
  /** Wieloprzebiegowe OCR (profile × PSM) — dokładność > szybkość */
  multiPass: boolean;
  maxOcrPasses: number;
  pdfTesseractFallback: boolean;
  pdfMaxPages: number;
  pdfRenderScale: number;
};

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return defaultValue;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Konfiguracja OCR z env (produkcja) z sensownymi domyślnymi. */
export function getOcrRuntimeConfig(overrides?: Partial<OcrRuntimeConfig>): OcrRuntimeConfig {
  const languages =
    overrides?.languages?.trim() ||
    process.env.OCR_LANGUAGES?.trim() ||
    DEFAULT_OCR_LANGUAGES;

  return {
    languages,
    timeoutMs:
      overrides?.timeoutMs ??
      parsePositiveInt(process.env.OCR_TIMEOUT_MS, DEFAULT_OCR_TIMEOUT_MS),
    preprocess:
      overrides?.preprocess ??
      parseBoolEnv(process.env.OCR_PREPROCESS, true),
    multiPass:
      overrides?.multiPass ??
      parseBoolEnv(process.env.OCR_MULTIPASS, true),
    maxOcrPasses:
      overrides?.maxOcrPasses ??
      parsePositiveInt(process.env.OCR_MAX_PASSES, DEFAULT_OCR_MAX_PASSES),
    pdfTesseractFallback:
      overrides?.pdfTesseractFallback ??
      parseBoolEnv(process.env.OCR_PDF_TESSERACT_FALLBACK, true),
    pdfMaxPages:
      overrides?.pdfMaxPages ??
      parsePositiveInt(process.env.OCR_PDF_MAX_PAGES, DEFAULT_OCR_PDF_MAX_PAGES),
    pdfRenderScale:
      overrides?.pdfRenderScale ??
      parsePositiveInt(process.env.OCR_PDF_RENDER_SCALE, DEFAULT_OCR_PDF_RENDER_SCALE),
  };
}

export function describeOcrEngineConfig(config: OcrRuntimeConfig = getOcrRuntimeConfig()) {
  return {
    engine: "tesseract.js" as const,
    languages: config.languages,
    preprocess: config.preprocess,
    multiPass: config.multiPass,
    maxOcrPasses: config.maxOcrPasses,
    pdfText: "pdf-parse",
    pdfScannedFallback: config.pdfTesseractFallback,
    pdfMaxPages: config.pdfMaxPages,
    pdfRenderScale: config.pdfRenderScale,
    timeoutMs: config.timeoutMs,
  };
}

/** Skala renderu PDF — używana przez pdf-render (env nadpisuje domyślną). */
export function getPdfRenderScale(config: OcrRuntimeConfig = getOcrRuntimeConfig()): number {
  const scale = config.pdfRenderScale;
  return scale >= 2 && scale <= 4 ? scale : DEFAULT_OCR_PDF_RENDER_SCALE;
}
