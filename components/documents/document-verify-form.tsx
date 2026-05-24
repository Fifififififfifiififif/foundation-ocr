"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { submitVerifyDocumentAction } from "@/app/actions/documents";
import { DocumentVerifyOcrPanel } from "@/components/documents/document-verify-ocr";
import { InvoiceParseSummary } from "@/components/documents/invoice-parse-summary";
import type { ParsedInvoice } from "@/lib/ocr/invoice-types";
import { Button } from "@/components/ui/button";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentVerifyFormActionState } from "@/lib/document-form-snapshot";
import type { VerifyDocumentFieldKey } from "@/lib/document-form-snapshot";
import { cn } from "@/lib/utils";

type Project = { id: string; name: string };
type Contractor = { id: string; name: string };

const initialActionState: DocumentVerifyFormActionState = { status: "idle" };

export function DocumentVerifyForm(props: {
  documentId: string;
  defaultFieldValues: Record<VerifyDocumentFieldKey, string>;
  netHint: string | null;
  grossHint: string | null;
  vatHint: string | null;
  projects: Project[];
  contractors: Contractor[];
  ocrMeanConfidence: number | null;
  ocrParsingConfidence: number | null;
  ocrProcessingStatus?: string | null;
  ocrProcessingError?: string | null;
  manualReviewRecommended: boolean;
  qualityReasons: unknown;
  parsedInvoice: ParsedInvoice | null;
}) {
  const router = useRouter();
  const boundAction = submitVerifyDocumentAction.bind(null, props.documentId);
  const [state, formAction, pending] = useActionState(boundAction, initialActionState);

  useEffect(() => {
    if (state.status === "saved") {
      router.replace(state.redirectTo);
    }
  }, [router, state]);

  const val = (k: VerifyDocumentFieldKey) =>
    state.status === "invalid"
      ? (state.values[k] ?? props.defaultFieldValues[k] ?? "")
      : props.defaultFieldValues[k] ?? "";

  const fieldErr = (k: VerifyDocumentFieldKey) =>
    state.status === "invalid" ? state.fieldErrors[k]?.[0] : undefined;

  return (
    <>
      <DocumentVerifyOcrPanel
        documentId={props.documentId}
        ocrMeanConfidence={props.ocrMeanConfidence}
        ocrParsingConfidence={props.ocrParsingConfidence}
        ocrProcessingStatus={props.ocrProcessingStatus}
        ocrProcessingError={props.ocrProcessingError}
        manualReviewRecommended={props.manualReviewRecommended}
        qualityReasons={props.qualityReasons}
      />
      <InvoiceParseSummary parsed={props.parsedInvoice} />
      <form action={formAction} className="mt-4 flex flex-col gap-4">
        {state.status === "invalid" ? <ErrorBanner message={state.message} /> : null}
        <input type="hidden" name="expenseCategory" value={val("expenseCategory")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="invoiceNumber">Numer faktury</Label>
            <Input
              id="invoiceNumber"
              name="invoiceNumber"
              key={`invoiceNumber-${val("invoiceNumber")}`}
              defaultValue={val("invoiceNumber")}
              className={cn(fieldErr("invoiceNumber") && "border-destructive")}
            />
            {fieldErr("invoiceNumber") ? (
              <p className="text-destructive text-xs">{fieldErr("invoiceNumber")}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="issueDate">Data wystawienia</Label>
            <Input
              id="issueDate"
              name="issueDate"
              type="date"
              key={`issueDate-${val("issueDate")}`}
              defaultValue={val("issueDate")}
              className={cn(fieldErr("issueDate") && "border-destructive")}
            />
            {fieldErr("issueDate") ? <p className="text-destructive text-xs">{fieldErr("issueDate")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paymentDate">Data płatności</Label>
            <Input
              id="paymentDate"
              name="paymentDate"
              type="date"
              key={`paymentDate-${val("paymentDate")}`}
              defaultValue={val("paymentDate")}
              className={cn(fieldErr("paymentDate") && "border-destructive")}
            />
            {fieldErr("paymentDate") ? (
              <p className="text-destructive text-xs">{fieldErr("paymentDate")}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amountNet">Kwota netto</Label>
            <Input
              id="amountNet"
              name="amountNet"
              inputMode="decimal"
              key={`amountNet-${val("amountNet")}`}
              defaultValue={val("amountNet")}
              className={cn(fieldErr("amountNet") && "border-destructive")}
            />
            {fieldErr("amountNet") ? (
              <p className="text-destructive text-xs">{fieldErr("amountNet")}</p>
            ) : props.netHint ? (
              <p className="text-muted-foreground text-xs">Odczyt: {props.netHint}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amountGross">Kwota brutto</Label>
            <Input
              id="amountGross"
              name="amountGross"
              inputMode="decimal"
              key={`amountGross-${val("amountGross")}`}
              defaultValue={val("amountGross")}
              className={cn(fieldErr("amountGross") && "border-destructive")}
            />
            {fieldErr("amountGross") ? (
              <p className="text-destructive text-xs">{fieldErr("amountGross")}</p>
            ) : props.grossHint ? (
              <p className="text-muted-foreground text-xs">Odczyt: {props.grossHint}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amountVat">Kwota VAT</Label>
            <Input
              id="amountVat"
              name="amountVat"
              inputMode="decimal"
              key={`amountVat-${val("amountVat")}`}
              defaultValue={val("amountVat")}
              className={cn(fieldErr("amountVat") && "border-destructive")}
            />
            {fieldErr("amountVat") ? (
              <p className="text-destructive text-xs">{fieldErr("amountVat")}</p>
            ) : props.vatHint ? (
              <p className="text-muted-foreground text-xs">Odczyt: {props.vatHint}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="documentType">Rodzaj dokumentu</Label>
            <Input
              id="documentType"
              name="documentType"
              key={`documentType-${val("documentType")}`}
              defaultValue={val("documentType")}
              className={cn(fieldErr("documentType") && "border-destructive")}
            />
            {fieldErr("documentType") ? (
              <p className="text-destructive text-xs">{fieldErr("documentType")}</p>
            ) : null}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="ocrVendorName">Sprzedawca (z dokumentu)</Label>
            <Input
              id="ocrVendorName"
              name="ocrVendorName"
              key={`ocrVendorName-${val("ocrVendorName")}`}
              defaultValue={val("ocrVendorName")}
              className={cn(fieldErr("ocrVendorName") && "border-destructive")}
            />
            {fieldErr("ocrVendorName") ? (
              <p className="text-destructive text-xs">{fieldErr("ocrVendorName")}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ocrContractorNip">NIP sprzedawcy (na dokumencie)</Label>
            <Input
              id="ocrContractorNip"
              name="ocrContractorNip"
              inputMode="numeric"
              autoComplete="off"
              placeholder="10 cyfr lub puste"
              key={`ocrContractorNip-${val("ocrContractorNip")}`}
              defaultValue={val("ocrContractorNip")}
              className={cn(fieldErr("ocrContractorNip") && "border-destructive")}
            />
            {fieldErr("ocrContractorNip") ? (
              <p className="text-destructive text-xs">{fieldErr("ocrContractorNip")}</p>
            ) : (
              <p className="text-muted-foreground text-xs">Dokładnie 10 cyfr albo puste.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ocrBankAccount">Rachunek bankowy (IBAN, opcjonalnie)</Label>
            <Input
              id="ocrBankAccount"
              name="ocrBankAccount"
              placeholder="Opcjonalnie — pełny numer PL…"
              key={`ocrBankAccount-${val("ocrBankAccount")}`}
              defaultValue={val("ocrBankAccount")}
              className={cn(fieldErr("ocrBankAccount") && "border-destructive")}
            />
            {fieldErr("ocrBankAccount") ? (
              <p className="text-destructive text-xs">{fieldErr("ocrBankAccount")}</p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="projectId">Projekt</Label>
            <select
              id="projectId"
              name="projectId"
              key={`projectId-${val("projectId")}`}
              defaultValue={val("projectId")}
              className={cn(
                "border-input bg-card h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                fieldErr("projectId") && "border-destructive",
              )}
            >
              <option value="">Brak przypisanego projektu</option>
              {props.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {fieldErr("projectId") ? <p className="text-destructive text-xs">{fieldErr("projectId")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contractorId">Kontrahent</Label>
            <select
              id="contractorId"
              name="contractorId"
              key={`contractorId-${val("contractorId")}`}
              defaultValue={val("contractorId")}
              className={cn(
                "border-input bg-card h-9 w-full rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                fieldErr("contractorId") && "border-destructive",
              )}
            >
              <option value="">Brak przypisanego kontrahenta</option>
              {props.contractors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {fieldErr("contractorId") ? (
              <p className="text-destructive text-xs">{fieldErr("contractorId")}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Uwagi</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={3}
            key={`notes-${val("notes").slice(0, 40)}`}
            defaultValue={val("notes")}
            className={cn(fieldErr("notes") && "border-destructive")}
          />
          {fieldErr("notes") ? <p className="text-destructive text-xs">{fieldErr("notes")}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button type="submit" name="_intent" value="approve" disabled={pending}>
            {pending ? "Zapisywanie…" : "Zatwierdź"}
          </Button>
          <Button type="submit" variant="secondary" name="_intent" value="draft" disabled={pending}>
            Zapisz jako szkic
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/documents/${props.documentId}`}>Anuluj</Link>
          </Button>
        </div>
      </form>
    </>
  );
}
