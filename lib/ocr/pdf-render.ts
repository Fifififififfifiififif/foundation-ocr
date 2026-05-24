import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

import type { OcrRuntimeConfig } from "@/lib/ocr/config";
import { getOcrRuntimeConfig, getPdfRenderScale } from "@/lib/ocr/config";

export type RenderedPdfPage = {
  pageNumber: number;
  png: Buffer;
};

/**
 * Renderuje strony PDF do PNG (Node) — pod OCR skanów bez warstwy tekstowej.
 */
export async function renderPdfPagesToPng(
  buffer: Buffer,
  maxPages: number,
  config: OcrRuntimeConfig = getOcrRuntimeConfig(),
): Promise<RenderedPdfPage[]> {
  const scale = getPdfRenderScale(config);
  if (!buffer?.length) {
    throw new Error("Brak pliku.");
  }

  const data = new Uint8Array(buffer);
  const doc = await getDocument({
    data,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  const pageCount = Math.min(doc.numPages, Math.max(1, maxPages));
  const pages: RenderedPdfPage[] = [];

  for (let i = 1; i <= pageCount; i += 1) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");

    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    pages.push({
      pageNumber: i,
      png: Buffer.from(canvas.toBuffer("image/png")),
    });
  }

  await doc.destroy().catch(() => {});

  return pages;
}
