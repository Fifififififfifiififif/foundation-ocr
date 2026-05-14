import { createWorker } from "tesseract.js";

const LANG = "pol+eng";

/**
 * OCR obrazów (JPG/PNG) — lokalnie, bez kluczy API.
 */
export async function extractImageText(
  buffer: Buffer,
): Promise<{ text: string; confidence: number }> {
  if (!buffer?.length) {
    throw new Error("Brak pliku.");
  }

  const worker = await createWorker(LANG, undefined, {
    logger: () => {},
  });

  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(buffer);
    const out = (text ?? "").replace(/\r\n/g, "\n").trim();
    if (!out) {
      throw new Error("OCR nie mogło odczytać dokumentu — brak rozpoznanego tekstu.");
    }
    const conf =
      typeof confidence === "number" && Number.isFinite(confidence) ? confidence : 0;
    return { text: out, confidence: conf };
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("OCR nie mogło")) throw e;
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Błąd OCR: ${detail}`);
  } finally {
    await worker.terminate().catch(() => {});
  }
}
