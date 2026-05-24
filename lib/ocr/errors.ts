import { OcrTimeoutError } from "@/lib/ocr/timeout";

/**
 * Czytelne komunikaty błędów OCR (Tesseract / pdf-parse) po polsku.
 */

function isGarbageMessage(s: string): boolean {
  const t = s.trim();
  if (!t) return true;
  if (/undefined\s+undefined/i.test(t)) return true;
  return false;
}

/** Komunikat już przygotowany przez warstwę OCR — nie doklejaj prefiksu. */
function isAlreadyUserFacing(message: string): boolean {
  const m = message.trim();
  if (!m) return false;
  if (/^(Brak pliku|Nieobsługiwany|Nie udało się|PDF nie|OCR nie)/i.test(m)) return true;
  if (/przekroczyło limit|timeout|Uszkodzony|Tesseract/i.test(m)) return true;
  if (/przetworzyć PDF|JPG|PNG|skan/i.test(m)) return true;
  return false;
}

export function describeOcrFailure(e: unknown): string {
  if (e == null) {
    return "OCR nie mogło odczytać dokumentu. Spróbuj ponownie z wyraźniejszym skanem.";
  }

  if (typeof e === "string") {
    const t = e.trim();
    return isGarbageMessage(t)
      ? "OCR nie mogło odczytać dokumentu. Sprawdź plik i spróbuj ponownie."
      : isAlreadyUserFacing(t)
        ? t
        : `Błąd OCR: ${t}`;
  }

  if (e instanceof OcrTimeoutError) {
    return e.message;
  }

  if (e instanceof Error) {
    const m = e.message.trim();
    if (!m) return "Błąd OCR: nieznany problem.";
    if (isAlreadyUserFacing(m)) return m;
    if (/worker|terminated|Aborted/i.test(m)) {
      return "Proces OCR został przerwany. Spróbuj ponownie.";
    }
    if (/memory|heap|ENOMEM/i.test(m)) {
      return "Brak pamięci na OCR — zmniejsz rozmiar pliku lub liczbę stron PDF.";
    }
    return `Błąd OCR: ${m}`;
  }

  try {
    const s = JSON.stringify(e, Object.getOwnPropertyNames(e as object));
    if (s && s !== "{}" && !isGarbageMessage(s)) {
      return `Błąd OCR: ${s.slice(0, 400)}`;
    }
  } catch {
    /* ignore */
  }

  return "OCR nie mogło odczytać dokumentu. Sprawdź format pliku i jakość obrazu.";
}

export function sanitizeOcrErrorQueryParam(raw: string | null): string | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (/undefined\s+undefined/i.test(t) || /^undefined\s*:\s*undefined$/i.test(t)) {
    return "Wcześniejszy nieczytelny błąd OCR. Uruchom ponownie OCR po aktualizacji aplikacji.";
  }
  return raw;
}
