import { PDFParse } from "pdf-parse";

import type { OcrRuntimeConfig } from "@/lib/ocr/config";
import { getOcrRuntimeConfig } from "@/lib/ocr/config";
import { renderPdfPagesToPng } from "@/lib/ocr/pdf-render";
import { extractMultiPageImageText } from "@/lib/ocr/tesseract";
import { withOcrTimeout } from "@/lib/ocr/timeout";

/** Minimalna długość tekstu uznawana za sensowny wynik (PDF z osadzonym tekstem). */
const MIN_TEXT_CHARS = 28;

export type PdfExtractResult = {
  text: string;
  /** null = warstwa tekstowa PDF (bez Tesseract) */
  meanConfidence: number | null;
  source: "pdf-text" | "tesseract-pdf";
};

function isScannedPdfError(e: unknown): boolean {
  return e instanceof Error && e.message === "PDF_SCANNED_NO_TEXT_LAYER";
}

const SCANNED_PDF_USER_HINT =
  "PDF nie zawiera wyciągalnego tekstu (prawdopodobnie skan). Wyeksportuj strony do JPG lub PNG, albo włącz OCR skanu PDF (OCR_PDF_TESSERACT_FALLBACK=true).";

/**
 * Wyciąga tekst z PDF: najpierw osadzona warstwa (pdf-parse),
 * potem opcjonalnie Tesseract na wyrenderowanych stronach (skany).
 */
export async function extractPdfText(
  buffer: Buffer,
  config: OcrRuntimeConfig = getOcrRuntimeConfig(),
): Promise<PdfExtractResult> {
  if (!buffer?.length) {
    throw new Error("Brak pliku.");
  }

  try {
    const text = await extractPdfEmbeddedText(buffer);
    return { text, meanConfidence: null, source: "pdf-text" };
  } catch (e: unknown) {
    if (isScannedPdfError(e)) {
      if (!config.pdfTesseractFallback) {
        throw new Error(SCANNED_PDF_USER_HINT);
      }
    } else {
      throw e;
    }
  }

  const ocrFromScan = async () => {
    const pages = await renderPdfPagesToPng(buffer, config.pdfMaxPages, config);
    if (!pages.length) {
      throw new Error("PDF nie zawiera stron do OCR.");
    }
    const { text, confidence } = await extractMultiPageImageText(
      pages.map((p) => p.png),
      config,
    );
    return {
      text,
      meanConfidence: confidence,
      source: "tesseract-pdf" as const,
    };
  };

  try {
    return await withOcrTimeout(ocrFromScan(), config.timeoutMs, "OCR skanu PDF");
  } catch (e: unknown) {
    if (e instanceof Error && /OCR nie mogło|Brak stron/i.test(e.message)) throw e;
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Nie udało się odczytać skanu PDF (Tesseract): ${detail}. Spróbuj wyeksportować strony do JPG/PNG.`,
    );
  }
}

async function extractPdfEmbeddedText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const raw = (result.text ?? "").replace(/\r\n/g, "\n").trim();
    const collapsed = raw.replace(/\s+/g, " ").trim();
    if (collapsed.length < MIN_TEXT_CHARS) {
      throw new Error("PDF_SCANNED_NO_TEXT_LAYER");
    }
    return raw;
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "PDF_SCANNED_NO_TEXT_LAYER") throw e;
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Nie udało się przetworzyć PDF: ${detail}`);
  } finally {
    await parser.destroy().catch(() => {});
  }
}
