import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ParsedInvoice } from "@/lib/ocr/invoice-types";
import { formatMoneyPl } from "@/lib/format/money";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

function confidenceBadge(score: number | null) {
  if (score == null) return <Badge variant="secondary">Brak oceny</Badge>;
  if (score >= 75) return <Badge className="bg-emerald-600/90">Wysoka ({score}%)</Badge>;
  if (score >= 50) return <Badge variant="secondary">Średnia ({score}%)</Badge>;
  return <Badge className="border-transparent bg-destructive text-destructive-foreground">Niska ({score}%)</Badge>;
}

export function InvoiceParseSummary({ parsed }: { parsed: ParsedInvoice | null }) {
  if (!parsed) return null;

  const missing: string[] = [];
  if (!parsed.invoiceNumber) missing.push("numer faktury");
  if (!parsed.amounts.gross && !parsed.amounts.net) missing.push("kwoty");
  if (!parsed.seller.taxId && !parsed.seller.name) missing.push("sprzedawca");

  return (
    <Card className="border-border/80 mb-4 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Podsumowanie OCR</CardTitle>
            <CardDescription>
              Język: {parsed.language.toUpperCase()} · {confidenceBadge(parsed.parsingConfidence)}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {parsed.warnings.length > 0 && (
          <ul className="text-amber-800 dark:text-amber-200 list-inside list-disc rounded-md border border-amber-200/80 bg-amber-50 p-3 text-xs dark:border-amber-900/50 dark:bg-amber-950/40">
            {parsed.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        {missing.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Brakujące pola: {missing.join(", ")} — uzupełnij ręcznie poniżej.
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">Dokument</p>
            <p className="font-medium">{parsed.documentType ?? "—"}</p>
            <p className="tabular-nums">{parsed.invoiceNumber ?? "—"}</p>
            <p className="text-muted-foreground text-xs">
              Wystawienie: {fmtDate(parsed.issueDate)} · Sprzedaż: {fmtDate(parsed.saleDate)} · Termin:{" "}
              {fmtDate(parsed.dueDate)}
            </p>
            {parsed.currency && <p className="text-xs">Waluta: {parsed.currency}</p>}
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">Kwoty</p>
            <p>Netto: {parsed.amounts.net != null ? formatMoneyPl(parsed.amounts.net) : "—"}</p>
            <p>VAT: {parsed.amounts.vat != null ? formatMoneyPl(parsed.amounts.vat) : "—"}</p>
            <p className="font-medium">
              Brutto: {parsed.amounts.gross != null ? formatMoneyPl(parsed.amounts.gross) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">Sprzedawca</p>
            <p>{parsed.seller.name ?? "—"}</p>
            <p className="text-xs">NIP: {parsed.seller.taxId ?? "—"}</p>
            {parsed.seller.email && <p className="text-xs">{parsed.seller.email}</p>}
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-medium uppercase">Nabywca</p>
            <p>{parsed.buyer.name ?? "—"}</p>
            <p className="text-xs">NIP: {parsed.buyer.taxId ?? "—"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground text-xs font-medium uppercase">Płatność</p>
            <p className="font-mono text-xs break-all">{parsed.bank.iban ?? parsed.bank.account ?? "—"}</p>
            {parsed.bank.swift && <p className="text-xs">SWIFT: {parsed.bank.swift}</p>}
            {parsed.paymentMethod && <p className="text-xs">Metoda: {parsed.paymentMethod}</p>}
          </div>
        </div>

        {parsed.lineItems.length > 0 && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase">
              Pozycje ({parsed.lineItems.length})
            </p>
            <div className="max-h-40 overflow-auto rounded-md border text-xs">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left">Nazwa</th>
                    <th className="p-2 text-right">Kwota</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.lineItems.slice(0, 15).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{row.name}</td>
                      <td className="p-2 text-right tabular-nums">
                        {row.lineTotal != null ? formatMoneyPl(row.lineTotal) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
