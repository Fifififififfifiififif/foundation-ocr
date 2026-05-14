"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import { FileArchive, MoreHorizontal, Plus } from "lucide-react";

import {
  bulkApproveDocuments,
  bulkArchiveDocuments,
  bulkDeleteDocuments,
} from "@/app/actions/documents";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoneyPl } from "@/lib/format/money";
import { cn } from "@/lib/utils";

function invoiceStatusBadgeClasses(status: InvoiceRow["status"]) {
  switch (status) {
    case "draft":
      return "border-zinc-600/40 bg-zinc-500/14 text-zinc-950 dark:border-zinc-500/45 dark:bg-zinc-500/22 dark:text-zinc-100";
    case "review":
      return "border-amber-600/45 bg-amber-500/18 text-amber-950 dark:border-amber-500/45 dark:bg-amber-500/24 dark:text-amber-50";
    case "approved":
      return "border-emerald-700/40 bg-emerald-600/16 text-emerald-950 dark:border-emerald-500/45 dark:bg-emerald-600/22 dark:text-emerald-50";
    default:
      return "";
  }
}

export type InvoiceRow = {
  id: string;
  invoiceNumber: string | null;
  projectUnassigned: boolean;
  contractorUnassigned: boolean;
  projectName: string;
  grantLabel: string;
  contractorName: string;
  amountGross: string | null;
  status: "draft" | "review" | "approved";
  statusLabel: string;
  archived: boolean;
  fileName: string;
  filePath: string;
};

type Props = {
  rows: InvoiceRow[];
  totalCount: number;
  hasInvoicesGlobally: boolean;
  isAdmin: boolean;
};

export function InvoicesPageClient({
  rows,
  totalCount,
  hasInvoicesGlobally,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const busy = React.useRef(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const runBulk = async (
    fn: (ids: string[]) => Promise<{ ok: boolean; error?: string; message?: string }>,
  ) => {
    if (busy.current || selected.size === 0) return;
    busy.current = true;
    try {
      const r = await fn([...selected]);
      if (r.ok) {
        toast.success(r.message ?? "Wykonano.");
        setSelected(new Set());
        router.refresh();
      } else toast.error(r.error ?? "Błąd");
    } finally {
      busy.current = false;
    }
  };

  const downloadAccountantZip = async () => {
    if (busy.current || selected.size === 0) return;
    busy.current = true;
    try {
      const res = await fetch("/api/documents/accountant-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
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
          toast.error(`Nie udało się pobrać pliku: ${d.fileName}`);
          return;
        }
        const buf = await fileRes.arrayBuffer();
        folder.file(d.fileName, buf);
      }

      zip.file("podsumowanie.csv", pack.csv);
      zip.file("metadata.json", JSON.stringify(pack.metadata, null, 2));

      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `ksiegowosc-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success("Paczka ZIP została pobrana.");
    } catch {
      toast.error("Nie udało się zbudować archiwum.");
    } finally {
      busy.current = false;
    }
  };

  const allSelected = rows.length > 0 && selected.size === rows.length;

  return (
    <div className="relative">
      {selected.size > 0 && (
        <div className="bg-card/95 supports-backdrop-filter:bg-card/80 sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-sm backdrop-blur">
          <p className="text-muted-foreground text-sm">
            Zaznaczono: <span className="text-foreground font-medium">{selected.size}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={() => runBulk(bulkApproveDocuments)}>
              Zatwierdź
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => runBulk(bulkArchiveDocuments)}>
              Archiwizuj
            </Button>
            <Button type="button" size="sm" onClick={downloadAccountantZip}>
              <FileArchive className="size-4" />
              Wyślij do księgowości (ZIP)
            </Button>
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={() => {
                  if (!confirm("Trwale usunąć zaznaczone faktury?")) return;
                  void runBulk(bulkDeleteDocuments);
                }}
              >
                Usuń
              </Button>
            )}
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <p className="text-muted-foreground mb-2 max-w-md text-sm">
            {totalCount === 0
              ? "Nie masz jeszcze żadnych faktur. Dodaj pierwszą, aby uruchomić OCR i rejestr kosztów."
              : "Brak wyników dla wybranych filtrów."}
          </p>
          {totalCount === 0 && (
            <Button asChild size="lg" className="mt-4">
              <Link href="/documents/new">
                <Plus className="size-4" />
                Dodaj fakturę
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Zaznacz wszystkie na stronie"
                  />
                </TableHead>
                <TableHead>Faktura</TableHead>
                <TableHead>Projekt</TableHead>
                <TableHead>Grant</TableHead>
                <TableHead>Kontrahent</TableHead>
                <TableHead className="text-right">Brutto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((d) => (
                <TableRow key={d.id} className={cn(d.archived && "opacity-60")}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(d.id)}
                      onCheckedChange={() => toggle(d.id)}
                      aria-label={`Zaznacz ${d.invoiceNumber ?? d.id}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/documents/${d.id}`} className="hover:underline">
                      {d.invoiceNumber ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[140px] truncate">
                    {d.projectUnassigned ? (
                      <Badge variant="secondary" className="text-muted-foreground font-normal">
                        {d.projectName}
                      </Badge>
                    ) : (
                      d.projectName
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[160px] truncate text-xs">
                    {d.grantLabel}
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    {d.contractorUnassigned ? (
                      <Badge variant="secondary" className="text-muted-foreground font-normal">
                        {d.contractorName}
                      </Badge>
                    ) : (
                      d.contractorName
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {d.amountGross != null && d.amountGross !== ""
                      ? formatMoneyPl(Number(d.amountGross))
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight shadow-none",
                        invoiceStatusBadgeClasses(d.status),
                      )}
                    >
                      {d.statusLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" className="size-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/documents/${d.id}`}>Szczegóły</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/documents/${d.id}/verify`}>Weryfikacja OCR</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`/api/files/${encodeURIComponent(d.filePath)}`} target="_blank" rel="noreferrer">
                            Pobierz plik
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {hasInvoicesGlobally && rows.length > 0 && (
        <Button
          asChild
          size="lg"
          className="fixed right-6 bottom-6 z-30 h-12 rounded-full px-6 shadow-lg"
        >
          <Link href="/documents/new">
            <Plus className="size-5" />
            Dodaj fakturę
          </Link>
        </Button>
      )}
    </div>
  );
}
