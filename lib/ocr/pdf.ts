import { PDFParse } from "pdf-parse";

/** Minimalna długość tekstu uznawana za sensowny wynik (PDF z osadzonym tekstem). */
const MIN_TEXT_CHARS = 28;

/**
 * Wyciąga tekst z PDF (osadzony). Skany bez warstwy tekstowej → wyjątek z jasnym komunikatem PL.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  if (!buffer?.length) {
    throw new Error("Brak pliku.");
  }

  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const raw = (result.text ?? "").replace(/\r\n/g, "\n").trim();
    const collapsed = raw.replace(/\s+/g, " ").trim();
    if (collapsed.length < MIN_TEXT_CHARS) {
      throw new Error(
        "PDF nie zawiera wyciągalnego tekstu (prawdopodobnie skan). Wyeksportuj strony do JPG lub PNG i prześlij je, albo użyj PDF z warstwą tekstową.",
      );
    }
    return raw;
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("PDF nie zawiera")) throw e;
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`Nie udało się przetworzyć PDF: ${detail}`);
  } finally {
    await parser.destroy().catch(() => {});
  }
}
