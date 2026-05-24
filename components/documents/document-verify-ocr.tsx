"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { retryDocumentOcr } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { WarningBanner } from "@/components/ui/warning-banner";

const OCR_STATUS_LABEL: Record<string, string> = {
  idle: "Oczekuje",
  processing: "Przetwarzanie…",
  completed: "Zakończono",
  failed: "Błąd OCR",
};

export function DocumentVerifyOcrPanel({
  documentId,
  ocrMeanConfidence,
  ocrParsingConfidence,
  ocrProcessingStatus,
  ocrProcessingError,
  manualReviewRecommended,
  qualityReasons,
}: {
  documentId: string;
  ocrMeanConfidence: number | null;
  ocrParsingConfidence?: number | null;
  ocrProcessingStatus?: string | null;
  ocrProcessingError?: string | null;
  manualReviewRecommended: boolean;
  qualityReasons: unknown;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const reasons = Array.isArray(qualityReasons)
    ? (qualityReasons as unknown[]).filter((x): x is string => typeof x === "string")
    : [];

  async function onRetry() {
    setBusy(true);
    try {
      const res = await retryDocumentOcr(documentId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(res.message ?? "OCR zakończone.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {manualReviewRecommended && (
        <WarningBanner title="Wykryto dane wymagające ręcznej weryfikacji">
          {reasons.length > 0 ? (
            <ul className="list-inside list-disc text-xs">
              {reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs">Sprawdź wszystkie pola względem skanu lub PDF.</p>
          )}
        </WarningBanner>
      )}

      <p className="text-muted-foreground text-xs">
        Silnik: <span className="text-foreground font-medium">Tesseract.js</span> (pol+eng). Status:{" "}
        <span className="text-foreground font-medium">
          {OCR_STATUS_LABEL[ocrProcessingStatus ?? "idle"] ?? ocrProcessingStatus}
        </span>
        {ocrProcessingError ? ` — ${ocrProcessingError}` : null}
      </p>

      <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
        {ocrMeanConfidence != null && (
          <p>
            Pewność OCR (Tesseract):{" "}
            <span className="text-foreground font-medium tabular-nums">{ocrMeanConfidence}%</span>
          </p>
        )}
        {ocrParsingConfidence != null && (
          <p>
            Pewność parsowania:{" "}
            <span className="text-foreground font-medium tabular-nums">{ocrParsingConfidence}%</span>
          </p>
        )}
      </div>

      <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onRetry} className="w-fit gap-2">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {busy ? "OCR w toku…" : "Ponów OCR (Tesseract)"}
      </Button>
    </div>
  );
}
