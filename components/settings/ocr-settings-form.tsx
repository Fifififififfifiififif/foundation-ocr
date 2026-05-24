"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { updateOcrSettings } from "@/app/actions/foundation-settings";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Initial = {
  ocrEnabled: boolean;
  maxUploadBytes: number;
};

const MB = (n: number) => n * 1024 * 1024;

export function OcrSettingsForm({ initial }: { initial: Initial }) {
  const [pending, start] = useTransition();
  const [enabled, setEnabled] = useState(initial.ocrEnabled);
  const [maxMb, setMaxMb] = useState(String(Math.round(initial.maxUploadBytes / MB(1))));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bytes = MB(Number(maxMb) || 10);
    start(async () => {
      const r = await updateOcrSettings({
        ocrEnabled: enabled,
        maxUploadBytes: bytes,
      });
      if (r.ok) toast.success(r.message ?? "Zapisano.");
      else toast.error(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg border p-4">
        <Checkbox id="ocr" checked={enabled} onCheckedChange={(v) => setEnabled(v === true)} />
        <div className="grid gap-1">
          <Label htmlFor="ocr" className="cursor-pointer font-medium">
            OCR włączone
          </Label>
          <p className="text-muted-foreground text-sm">
            Po wyłączeniu nowe dokumenty zapisują się bez automatycznego odczytu OCR (Tesseract / PDF).
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Maksymalny rozmiar przesyłanego pliku</Label>
        <Select value={maxMb} onValueChange={setMaxMb}>
          <SelectTrigger className="max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="5">5 MB</SelectItem>
            <SelectItem value="10">10 MB</SelectItem>
            <SelectItem value="15">15 MB</SelectItem>
            <SelectItem value="25">25 MB</SelectItem>
            <SelectItem value="50">50 MB</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-sm">
          Obsługiwane typy: PDF, JPG, PNG. Silnik: Tesseract.js (multi-pass, pol+eng+deu+fra), zaawansowany preprocess,
          skany PDF (render 3×). Env: <code className="bg-muted rounded px-1">OCR_LANGUAGES</code>,{" "}
          <code className="bg-muted rounded px-1">OCR_MULTIPASS</code>,{" "}
          <code className="bg-muted rounded px-1">OCR_MAX_PASSES</code>.
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Zapisywanie…" : "Zapisz ustawienia OCR"}
      </Button>
    </form>
  );
}
