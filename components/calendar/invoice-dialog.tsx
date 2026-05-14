"use client";

import Link from "next/link";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { ExternalLink, FileArchive, FileDown, ListTree, Pencil } from "lucide-react";

import { bulkApproveDocuments } from "@/app/actions/documents";
import {
  type CalendarInvoice,
  dayKey,
  isOverdue,
  ocrStatusLabel,
} from "@/components/calendar/calendar-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatMoneyPl } from "@/lib/format/money";
import { documentStatusPl } from "@/lib/ui-i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  invoices: CalendarInvoice[];
  onRefresh: () => void;
};

function fmtPlDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "d MMM yyyy", { locale: pl });
}

export function InvoiceDayDialog({ open, onOpenChange, date, invoices, onRefresh }: Props) {
  const dayParam = date ? dayKey(date) : "";

  async function approveOne(id: string) {
    const r = await bulkApproveDocuments([id]);
    if (r.ok) {
      toast.success(r.message ?? "Zatwierdzono.");
      onRefresh();
    } else toast.error(r.error ?? "Błąd");
  }

  async function accountantZip(id: string) {
    try {
      const res = await fetch("/api/documents/accountant-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Błąd eksportu");
        return;
      }
      const pack = (await res.json()) as {
        csv: string;
        metadata: unknown;
        documents: { fileName: string; downloadUrl: string }[];
      };
      const zip = new JSZip();
      const folder = zip.folder("faktury");
      if (!folder) throw new Error("zip");
      for (const d of pack.documents) {
        const fileRes = await fetch(d.downloadUrl, { credentials: "include" });
        if (!fileRes.ok) {
          toast.error(`Nie udało się pobrać: ${d.fileName}`);
          return;
        }
        folder.file(d.fileName, await fileRes.arrayBuffer());
      }
      zip.file("podsumowanie.csv", pack.csv);
      zip.file("metadata.json", JSON.stringify(pack.metadata, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `faktura-${id.slice(0, 8)}.zip`);
      toast.success("Paczka dla księgowości pobrana.");
    } catch {
      toast.error("Błąd generowania ZIP.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92vh,40rem)] max-w-[calc(100vw-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-border/60 dark:border-white/20 shrink-0 space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-lg">Szczegóły dnia</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm leading-relaxed">
            {date
              ? format(date, "EEEE, d MMMM yyyy", { locale: pl })
              : "Wybierz dzień w kalendarzu"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {invoices.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Brak faktur z datą wystawienia w tym dniu.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {invoices.map((inv) => {
                const overdue = isOverdue(inv);
                const gross =
                  inv.amountGross != null && inv.amountGross !== ""
                    ? formatMoneyPl(Number(inv.amountGross))
                    : "—";
                return (
                  <li
                    key={inv.id}
                    className="rounded-xl border border-border bg-card p-4 shadow-sm transition-[box-shadow,transform] duration-150 hover:shadow-md dark:border-white dark:bg-zinc-950/80"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="text-foreground truncate text-sm font-semibold tracking-tight tabular-nums">
                          {inv.invoiceNumber ?? "—"}
                        </p>
                        <p className="text-muted-foreground truncate text-sm">{inv.contractorName}</p>
                        <p className="text-muted-foreground/90 truncate text-xs">{inv.projectName}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge variant={inv.status === "approved" ? "default" : "secondary"}>
                          {documentStatusPl(inv.status)}
                        </Badge>
                        <Badge variant={inv.hasOcr ? "outline" : "secondary"} className="text-[10px] font-normal">
                          {ocrStatusLabel(inv.hasOcr)}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-1 text-xs">
                      <p className="tabular-nums">
                        <span className="text-muted-foreground">Kwota brutto: </span>
                        <span className="text-foreground font-semibold">{gross}</span>
                      </p>
                      <p className="tabular-nums">
                        <span className="text-muted-foreground">Termin płatności: </span>
                        <span className="text-foreground font-medium">{fmtPlDate(inv.paymentDate)}</span>
                      </p>
                      <p>
                        <span className="text-muted-foreground">Płatność: </span>
                        <span
                          className={
                            overdue
                              ? "text-destructive font-semibold"
                              : inv.status === "approved"
                                ? "font-medium text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground font-medium"
                          }
                        >
                          {overdue
                            ? "Po terminie płatności"
                            : inv.status === "approved"
                              ? "Zatwierdzona"
                              : "Niezatwierdzona"}
                        </span>
                      </p>
                    </div>

                    <Separator className="my-4 bg-border dark:bg-white/15" />

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-1.5" asChild>
                        <Link href={`/documents/${inv.id}`}>
                          <ExternalLink className="size-3.5 opacity-90" />
                          Otwórz
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground dark:border-white/70 dark:hover:bg-white/10 [&_svg]:text-foreground"
                        asChild
                      >
                        <Link href={`/documents/${inv.id}`}>
                          <Pencil className="size-3.5 opacity-90" />
                          Edytuj
                        </Link>
                      </Button>
                      {inv.status !== "approved" && (
                        <Button size="sm" variant="secondary" type="button" onClick={() => approveOne(inv.id)}>
                          Zatwierdź
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        type="button"
                        className="gap-1.5 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground dark:border-white/70 dark:hover:bg-white/10 [&_svg]:text-foreground"
                        onClick={() => accountantZip(inv.id)}
                      >
                        <FileArchive className="size-3.5 opacity-90" />
                        Zip
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-foreground hover:bg-accent hover:text-accent-foreground dark:text-zinc-100 dark:hover:bg-white/10 [&_svg]:text-foreground"
                        asChild
                      >
                        <a
                          href={`/api/files/${encodeURIComponent(inv.filePath)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileDown className="size-3.5 opacity-90" />
                          Pobierz plik
                        </a>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {date && invoices.length > 0 ? (
          <DialogFooter className="border-border/60 bg-muted/25 shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-start dark:border-white/15">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground sm:w-auto dark:border-white/70 dark:hover:bg-white/10 [&_svg]:text-foreground"
              asChild
            >
              <Link href={`/documents?from=${dayParam}&to=${dayParam}`}>
                <ListTree className="size-3.5 opacity-90" />
                Lista w module faktur
              </Link>
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
