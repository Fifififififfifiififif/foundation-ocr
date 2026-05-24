import { z } from "zod";

export const manualLineItemSchema = z.object({
  description: z.string().min(1, "Opis pozycji jest wymagany"),
  quantity: z.coerce.number().positive().default(1),
  unit: z.string().optional(),
  unitPrice: z.coerce.number().optional(),
  vatRate: z.coerce.number().min(0).max(100).optional(),
  netAmount: z.coerce.number().optional(),
  vatAmount: z.coerce.number().optional(),
  grossAmount: z.coerce.number().optional(),
});

const optionalNumber = z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
}, z.number().optional());

export const manualInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1, "Numer faktury jest wymagany"),
  issueDate: z.string().trim().min(1, "Data wystawienia jest wymagana"),
  dueDate: z.string().optional(),
  paymentDate: z.string().optional(),
  sellerName: z.string().trim().min(1, "Sprzedawca jest wymagany"),
  sellerNip: z.string().optional(),
  sellerAddress: z.string().optional(),
  sellerEmail: z.string().optional(),
  sellerPhone: z.string().optional(),
  buyerName: z.string().optional(),
  buyerNip: z.string().optional(),
  buyerAddress: z.string().optional(),
  paymentMethod: z.string().optional(),
  bankAccount: z.string().optional(),
  iban: z.string().optional(),
  currency: z.string().default("PLN"),
  amountNet: optionalNumber,
  amountVat: optionalNumber,
  amountGross: optionalNumber,
  notes: z.string().optional(),
  expenseCategory: z.string().optional(),
  projectId: z.string().optional(),
  contractorId: z.string().optional(),
  classification: z.enum(["INCOME", "EXPENSE"]).optional(),
  isCommitment: z.coerce.boolean().optional(),
  lineItems: z.array(manualLineItemSchema).default([]),
});

export type ManualInvoiceInput = z.infer<typeof manualInvoiceSchema>;

/** Usuwa puste wiersze pozycji przed walidacją. */
export function prepareManualInvoiceInput(data: ManualInvoiceInput): ManualInvoiceInput {
  return {
    ...data,
    lineItems: (data.lineItems ?? []).filter((i) => i.description.trim().length > 0),
  };
}

export function parseDateOrNull(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
