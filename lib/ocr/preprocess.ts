import { getOcrRuntimeConfig } from "@/lib/ocr/config";
import { renderPreprocessProfile } from "@/lib/ocr/preprocess-profiles";

/**
 * Przygotowanie obrazu pod Tesseract (profil standard).
 * Multi-pass używa `renderPreprocessProfile` bezpośrednio.
 */
export async function preprocessImageForOcr(
  buffer: Buffer,
  options?: { enabled?: boolean },
): Promise<Buffer> {
  const enabled = options?.enabled ?? getOcrRuntimeConfig().preprocess;
  if (!enabled) return buffer;
  return renderPreprocessProfile(buffer, "standard");
}