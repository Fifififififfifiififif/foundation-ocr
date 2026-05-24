"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, FileUp } from "lucide-react";
import { toast } from "sonner";

import { submitCreateDocument } from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Project = { id: string; name: string; grantNumber: string };
type Contractor = { id: string; name: string; nip: string | null };

const NONE = "__none__";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function DocumentUploadForm({
  projects,
  contractors,
  maxUploadBytes,
  ocrEnabled,
}: {
  projects: Project[];
  contractors: Contractor[];
  maxUploadBytes: number;
  ocrEnabled: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const [projectId, setProjectId] = useState(NONE);
  const [contractorId, setContractorId] = useState(NONE);
  const [pending, setPending] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKind, setPreviewKind] = useState<"image" | "pdf" | null>(null);
  const [pickedMeta, setPickedMeta] = useState<{ name: string; size: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewObjectUrlRef = useRef<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mb = Math.max(1, Math.round(maxUploadBytes / (1024 * 1024)));

  const syncFileFromInput = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    const file = inputRef.current?.files?.[0] ?? null;
    if (!file) {
      setPreviewUrl(null);
      setPreviewKind(null);
      setPickedMeta(null);
      return;
    }
    setPickedMeta({ name: file.name, size: file.size });
    const lower = file.name.toLowerCase();
    const isPdf = file.type === "application/pdf" || lower.endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png)$/i.test(lower);
    if (isImage) {
      const url = URL.createObjectURL(file);
      previewObjectUrlRef.current = url;
      setPreviewKind("image");
      setPreviewUrl(url);
      return;
    }
    if (isPdf) {
      const url = URL.createObjectURL(file);
      previewObjectUrlRef.current = url;
      setPreviewKind("pdf");
      setPreviewUrl(url);
      return;
    }
    setPreviewKind(null);
    setPreviewUrl(null);
  }, []);

  const clearPickedFile = useCallback(() => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewKind(null);
    setPickedMeta(null);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
        previewObjectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!pending) {
      if (progressTimer.current) {
        clearInterval(progressTimer.current);
        progressTimer.current = null;
      }
      setProgressMsg("");
      return;
    }
    const steps = ocrEnabled
      ? [
          "Walidacja pliku…",
          "Zapis na serwerze…",
          "Przygotowanie obrazu (Tesseract)…",
          "Odczyt OCR — pol+eng (może potrwać)…",
          "Parsowanie faktury…",
        ]
      : ["Walidacja pliku…", "Zapis na serwerze…"];
    let i = 0;
    setProgressMsg(steps[0] ?? "");
    progressTimer.current = setInterval(() => {
      i = (i + 1) % steps.length;
      setProgressMsg(steps[i] ?? "");
    }, 2800);
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [pending, ocrEnabled]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const el = inputRef.current;
    const file = el?.files?.[0];
    if (!file) {
      toast.error("Wybierz plik do przesłania.");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("projectId", projectId === NONE ? "" : projectId);
    fd.set("contractorId", contractorId === NONE ? "" : contractorId);
    setPending(true);
    try {
      await submitCreateDocument(fd);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative flex flex-col gap-6">
      {pending && (
        <div className="bg-background/85 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-sm">
          <div className="border-primary size-10 animate-spin rounded-full border-2 border-t-transparent" />
          <p className="text-sm font-medium">Przetwarzanie…</p>
          <p className="text-muted-foreground max-w-xs px-4 text-center text-xs">{progressMsg}</p>
        </div>
      )}
      <div
        className={cn(
          "border-muted-foreground/25 hover:border-muted-foreground/40 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          drag && "border-primary bg-muted/40",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(f);
            inputRef.current.files = dt.files;
            syncFileFromInput();
          }
        }}
      >
        <input
          ref={inputRef}
          id="file"
          type="file"
          className="sr-only"
          accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
          onChange={syncFileFromInput}
        />
        <FileUp className="text-muted-foreground mx-auto mb-3 size-10" />
        <p className="text-sm font-medium">Przeciągnij plik tutaj lub wybierz z dysku</p>
        <p className="text-muted-foreground mt-1 text-xs">
          PDF, JPG lub PNG — do {mb} MB.{" "}
          {ocrEnabled
            ? "Po przesłaniu: Tesseract (PL+EN), PDF ze skanem — OCR stron."
            : "OCR jest wyłączone w ustawieniach — dokument zostanie zapisany bez odczytu."}
        </p>
        <Button type="button" variant="secondary" className="mt-4" onClick={() => inputRef.current?.click()}>
          Wybierz plik
        </Button>

        {pickedMeta ? (
          <div className="border-border bg-muted/30 mt-6 rounded-lg border text-left">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <span className="truncate text-xs font-medium">{pickedMeta.name}</span>
              </div>
              <span className="text-muted-foreground shrink-0 text-[11px] tabular-nums">
                {formatBytes(pickedMeta.size)}
              </span>
            </div>
            {previewUrl && previewKind === "image" ? (
              <div className="bg-background/80 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL z dysku użytkownika */}
                <img
                  src={previewUrl}
                  alt={`Podgląd: ${pickedMeta.name}`}
                  className="mx-auto max-h-72 w-auto max-w-full rounded-md object-contain"
                />
              </div>
            ) : null}
            {previewUrl && previewKind === "pdf" ? (
              <div className="bg-muted/50 h-[min(28rem,55vh)] w-full overflow-hidden rounded-b-md">
                <iframe
                  title={`Podgląd PDF: ${pickedMeta.name}`}
                  src={previewUrl}
                  className="size-full min-h-[16rem] border-0"
                />
              </div>
            ) : null}
            {!previewUrl && pickedMeta ? (
              <p className="text-muted-foreground px-3 py-4 text-center text-xs">
                Podgląd jest dostępny dla PDF oraz JPG/PNG.
              </p>
            ) : null}
            <div className="flex justify-end border-t px-2 py-2">
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground h-8 text-xs" onClick={clearPickedFile}>
                Usuń plik
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Projekt / grant</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Brak przypisanego projektu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Brak przypisanego projektu</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.grantNumber})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kontrahent</Label>
          <Select value={contractorId} onValueChange={setContractorId}>
            <SelectTrigger>
              <SelectValue placeholder="Brak przypisanego kontrahenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Brak przypisanego kontrahenta</SelectItem>
              {contractors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} — NIP {c.nip ?? "brak"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Przesyłanie…" : ocrEnabled ? "Prześlij i uruchom OCR" : "Prześlij dokument"}
        </Button>
        <Button type="button" variant="outline" asChild disabled={pending}>
          <Link href="/documents">Anuluj</Link>
        </Button>
      </div>
    </form>
  );
}
