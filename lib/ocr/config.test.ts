import { describe, expect, it, beforeEach, afterEach } from "vitest";

import {
  DEFAULT_OCR_LANGUAGES,
  getOcrRuntimeConfig,
  describeOcrEngineConfig,
} from "@/lib/ocr/config";

describe("getOcrRuntimeConfig", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.OCR_LANGUAGES;
    delete process.env.OCR_PREPROCESS;
    delete process.env.OCR_PDF_TESSERACT_FALLBACK;
    delete process.env.OCR_TIMEOUT_MS;
    delete process.env.OCR_PDF_MAX_PAGES;
    delete process.env.OCR_MULTIPASS;
    delete process.env.OCR_MAX_PASSES;
    delete process.env.OCR_PDF_RENDER_SCALE;
  });

  afterEach(() => {
    process.env = env;
  });

  it("uses multilingual pack by default", () => {
    expect(getOcrRuntimeConfig().languages).toBe(DEFAULT_OCR_LANGUAGES);
    expect(getOcrRuntimeConfig().multiPass).toBe(true);
    expect(getOcrRuntimeConfig().maxOcrPasses).toBe(12);
  });

  it("reads OCR_LANGUAGES from env", () => {
    process.env.OCR_LANGUAGES = "eng";
    expect(getOcrRuntimeConfig().languages).toBe("eng");
  });

  it("describeOcrEngineConfig exposes tesseract", () => {
    const d = describeOcrEngineConfig();
    expect(d.engine).toBe("tesseract.js");
    expect(d.pdfScannedFallback).toBe(true);
  });
});
