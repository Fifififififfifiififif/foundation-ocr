import { NextResponse } from "next/server";

import { getApiAppContext } from "@/lib/api-app-context";
import { describeOcrEngineConfig, getOcrRuntimeConfig } from "@/lib/ocr/config";

/** Diagnostyka silnika OCR (wymaga włączonego modułu OCR w organizacji). */
export async function GET() {
  const resolved = await getApiAppContext({ module: "OCR" });
  if (!resolved.ok) return resolved.response;

  const config = getOcrRuntimeConfig();
  const engine = describeOcrEngineConfig(config);

  return NextResponse.json({
    ...engine,
    message:
      "OCR działa lokalnie (Tesseract.js + pdf-parse). Obrazy: preprocess + pol+eng. Skany PDF: render + Tesseract gdy włączony fallback.",
  });
}
