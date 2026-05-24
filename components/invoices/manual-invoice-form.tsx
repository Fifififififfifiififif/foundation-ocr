"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { FileUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { FieldPath } from "react-hook-form";

import { submitCreateManualInvoice } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  manualInvoiceSchema,
  prepareManualInvoiceInput,
  type ManualInvoiceInput,
} from "@/src/modules/invoices/manual-schema";
import {
  CLASSIFICATION_LABELS,
  suggestInvoiceClassification,
} from "@/src/modules/invoices/classification";

type Props = {
  defaultValues?: Partial<ManualInvoiceInput>;
  projects: { id: string; name: string }[];
  contractors: { id: string; name: string }[];
  maxUploadBytes: number;
  submitLabel?: string;
  organizationNip?: string | null;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-destructive text-sm">{message}</p>;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export function ManualInvoiceForm({
  defaultValues,
  projects,
  contractors,
  maxUploadBytes,
  submitLabel = "Zapisz fakturę",
  organizationNip,
}: Props) {
  const [pending, setPending] = useState(false);
  const [pickedFile, setPickedFile] = useState<{ name: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ManualInvoiceInput>({
    defaultValues: {
      currency: "PLN",
      lineItems: [],
      invoiceNumber: "",
      issueDate: "",
      sellerName: "",
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const errors = form.formState.errors;
  const mb = Math.max(1, Math.round(maxUploadBytes / (1024 * 1024)));
  const sellerNip = form.watch("sellerNip");
  const buyerNip = form.watch("buyerNip");
  const classification = form.watch("classification");

  useEffect(() => {
    const suggested = suggestInvoiceClassification({ organizationNip, sellerNip, buyerNip });
    if (suggested && !classification) {
      form.setValue("classification", suggested);
    }
  }, [organizationNip, sellerNip, buyerNip, classification, form]);

  const syncFileMeta = useCallback(() => {
    const file = fileInputRef.current?.files?.[0];
    setPickedFile(file ? { name: file.name, size: file.size } : null);
  }, []);

  async function onSubmit(raw: ManualInvoiceInput) {
    form.clearErrors();
    const prepared = prepareManualInvoiceInput(raw);
    const result = manualInvoiceSchema.safeParse(prepared);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.join(".") as FieldPath<ManualInvoiceInput>;
        form.setError(path, { type: "manual", message: issue.message });
      }
      toast.error("Uzupełnij wymagane pola (numer, data, sprzedawca).");
      return;
    }

    const parsed = result.data;
    setPending(true);
    try {
      const fd = new FormData();
      const file = fileInputRef.current?.files?.[0];
      if (file) fd.set("file", file);

      const scalarKeys = [
        "invoiceNumber",
        "issueDate",
        "dueDate",
        "paymentDate",
        "sellerName",
        "sellerNip",
        "sellerAddress",
        "sellerEmail",
        "sellerPhone",
        "buyerName",
        "buyerNip",
        "buyerAddress",
        "paymentMethod",
        "bankAccount",
        "iban",
        "currency",
        "amountNet",
        "amountVat",
        "amountGross",
        "notes",
        "expenseCategory",
        "classification",
        "isCommitment",
        "projectId",
        "contractorId",
      ] as const;

      for (const key of scalarKeys) {
        const v = parsed[key];
        if (v !== undefined && v !== null && v !== "") {
          fd.set(key, String(v));
        }
      }
      fd.set("lineItems", JSON.stringify(parsed.lineItems));

      await submitCreateManualInvoice(fd);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      encType="multipart/form-data"
      className="space-y-8"
      noValidate
    >
      <section className="border-border space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <h3 className="text-lg font-semibold">Skan faktury (opcjonalnie)</h3>
          <p className="text-muted-foreground text-sm">
            Dołącz PDF lub zdjęcie — plik zostanie zapisany bez OCR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <label className="cursor-pointer">
              <FileUp className="mr-1.5 size-4" />
              Wybierz plik
              <input
                ref={fileInputRef}
                type="file"
                name="file"
                accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                className="sr-only"
                onChange={syncFileMeta}
              />
            </label>
          </Button>
          {pickedFile ? (
            <span className="text-muted-foreground text-sm">
              {pickedFile.name} ({formatBytes(pickedFile.size)})
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">Brak pliku</span>
          )}
          {pickedFile ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (fileInputRef.current) fileInputRef.current.value = "";
                setPickedFile(null);
              }}
            >
              Usuń plik
            </Button>
          ) : null}
        </div>
        <p className="text-muted-foreground text-xs">Maks. {mb} MB · PDF, JPG, PNG</p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Typ faktury</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Klasyfikacja *</Label>
            <Select
              value={form.watch("classification") ?? ""}
              onValueChange={(v) => form.setValue("classification", v as "INCOME" | "EXPENSE")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz typ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">{CLASSIFICATION_LABELS.INCOME}</SelectItem>
                <SelectItem value="EXPENSE">{CLASSIFICATION_LABELS.EXPENSE}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Dane faktury</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Numer faktury *</Label>
            <Input id="invoiceNumber" {...form.register("invoiceNumber")} aria-invalid={!!errors.invoiceNumber} />
            <FieldError message={errors.invoiceNumber?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Waluta</Label>
            <Input id="currency" {...form.register("currency")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="issueDate">Data wystawienia *</Label>
            <Input id="issueDate" type="date" {...form.register("issueDate")} aria-invalid={!!errors.issueDate} />
            <FieldError message={errors.issueDate?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dueDate">Termin płatności</Label>
            <Input id="dueDate" type="date" {...form.register("dueDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Data płatności</Label>
            <Input id="paymentDate" type="date" {...form.register("paymentDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenseCategory">Kategoria</Label>
            <Input id="expenseCategory" {...form.register("expenseCategory")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Sprzedawca</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sellerName">Nazwa *</Label>
            <Input id="sellerName" {...form.register("sellerName")} aria-invalid={!!errors.sellerName} />
            <FieldError message={errors.sellerName?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellerNip">NIP</Label>
            <Input id="sellerNip" {...form.register("sellerNip")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sellerEmail">Email</Label>
            <Input id="sellerEmail" {...form.register("sellerEmail")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="sellerAddress">Adres</Label>
            <Textarea id="sellerAddress" {...form.register("sellerAddress")} rows={2} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Nabywca</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="buyerName">Nazwa</Label>
            <Input id="buyerName" {...form.register("buyerName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="buyerNip">NIP</Label>
            <Input id="buyerNip" {...form.register("buyerNip")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="buyerAddress">Adres</Label>
            <Textarea id="buyerAddress" {...form.register("buyerAddress")} rows={2} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Płatność</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Metoda</Label>
            <Input id="paymentMethod" {...form.register("paymentMethod")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccount">Rachunek</Label>
            <Input id="bankAccount" {...form.register("bankAccount")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" {...form.register("iban")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Kwoty</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="amountNet">Netto</Label>
            <Input id="amountNet" type="number" step="0.01" {...form.register("amountNet")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amountVat">VAT</Label>
            <Input id="amountVat" type="number" step="0.01" {...form.register("amountVat")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amountGross">Brutto</Label>
            <Input id="amountGross" type="number" step="0.01" {...form.register("amountGross")} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold">Pozycje</h3>
            <p className="text-muted-foreground text-sm">Opcjonalnie — puste wiersze są pomijane.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", quantity: 1 })}
          >
            <Plus className="mr-1 size-4" />
            Dodaj pozycję
          </Button>
        </div>
        {fields.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
            Brak pozycji na fakturze — możesz zapisać sam nagłówek i kwoty powyżej.
          </p>
        ) : null}
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="border-border grid gap-3 rounded-lg border p-4 sm:grid-cols-6"
          >
            <div className="space-y-2 sm:col-span-2">
              <Label>Opis</Label>
              <Input {...form.register(`lineItems.${index}.description`)} />
              <FieldError message={errors.lineItems?.[index]?.description?.message} />
            </div>
            <div className="space-y-2">
              <Label>Ilość</Label>
              <Input type="number" step="0.01" {...form.register(`lineItems.${index}.quantity`)} />
            </div>
            <div className="space-y-2">
              <Label>Cena jedn.</Label>
              <Input type="number" step="0.01" {...form.register(`lineItems.${index}.unitPrice`)} />
            </div>
            <div className="space-y-2">
              <Label>VAT %</Label>
              <Input type="number" {...form.register(`lineItems.${index}.vatRate`)} />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Projekt</Label>
          <Select
            value={form.watch("projectId") ?? "none"}
            onValueChange={(v) => form.setValue("projectId", v === "none" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcjonalnie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— brak —</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Kontrahent</Label>
          <Select
            value={form.watch("contractorId") ?? "none"}
            onValueChange={(v) => form.setValue("contractorId", v === "none" ? undefined : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Opcjonalnie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— brak —</SelectItem>
              {contractors.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notatki</Label>
          <Textarea id="notes" {...form.register("notes")} rows={3} />
        </div>
      </section>

      <div className="border-border border-t pt-6">
        <Button type="submit" disabled={pending} size="lg">
          {pending ? "Zapisywanie…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
