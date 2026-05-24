import {
  manualInvoiceSchema,
  prepareManualInvoiceInput,
  type ManualInvoiceInput,
} from "@/src/modules/invoices/manual-schema";

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function numOrUndef(v: string): number | undefined {
  const t = v.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

export function parseManualInvoiceFromFormData(formData: FormData): ManualInvoiceInput {
  const lineItemsRaw = formData.get("lineItems");
  let lineItems: ManualInvoiceInput["lineItems"] = [];
  if (typeof lineItemsRaw === "string" && lineItemsRaw.trim()) {
    try {
      const parsed = JSON.parse(lineItemsRaw) as unknown;
      if (Array.isArray(parsed)) lineItems = parsed;
    } catch {
      lineItems = [];
    }
  }

  const raw = {
    invoiceNumber: str(formData, "invoiceNumber"),
    issueDate: str(formData, "issueDate"),
    dueDate: str(formData, "dueDate") || undefined,
    paymentDate: str(formData, "paymentDate") || undefined,
    sellerName: str(formData, "sellerName"),
    sellerNip: str(formData, "sellerNip") || undefined,
    sellerAddress: str(formData, "sellerAddress") || undefined,
    sellerEmail: str(formData, "sellerEmail") || undefined,
    sellerPhone: str(formData, "sellerPhone") || undefined,
    buyerName: str(formData, "buyerName") || undefined,
    buyerNip: str(formData, "buyerNip") || undefined,
    buyerAddress: str(formData, "buyerAddress") || undefined,
    paymentMethod: str(formData, "paymentMethod") || undefined,
    bankAccount: str(formData, "bankAccount") || undefined,
    iban: str(formData, "iban") || undefined,
    currency: str(formData, "currency") || "PLN",
    amountNet: numOrUndef(str(formData, "amountNet")),
    amountVat: numOrUndef(str(formData, "amountVat")),
    amountGross: numOrUndef(str(formData, "amountGross")),
    notes: str(formData, "notes") || undefined,
    expenseCategory: str(formData, "expenseCategory") || undefined,
    classification:
      str(formData, "classification") === "INCOME" || str(formData, "classification") === "EXPENSE"
        ? (str(formData, "classification") as "INCOME" | "EXPENSE")
        : undefined,
    isCommitment: str(formData, "isCommitment") === "true",
    projectId: str(formData, "projectId") || undefined,
    contractorId: str(formData, "contractorId") || undefined,
    lineItems,
  };

  return manualInvoiceSchema.parse(prepareManualInvoiceInput(raw as ManualInvoiceInput));
}
