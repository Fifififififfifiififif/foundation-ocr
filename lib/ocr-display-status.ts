/** Status OCR do UI (bez osobnych kolumn w bazie). */
export function deriveOcrDisplayStatus(
  ocrRawText: string | null | undefined,
  ocrError?: string | null,
): { status: "idle" | "completed" | "failed"; error: string | null } {
  if (ocrError?.trim()) {
    return { status: "failed", error: ocrError.trim() };
  }
  if (ocrRawText?.trim()) {
    return { status: "completed", error: null };
  }
  return { status: "idle", error: null };
}
