import type { InvoiceClassification } from "@/generated/prisma";

export function normalizeNipDigits(nip: string | null | undefined): string | null {
  if (!nip?.trim()) return null;
  const d = nip.replace(/\D/g, "");
  return d.length === 10 ? d : null;
}

/** Heurystyka: NIP organizacji vs strony faktury. */
export function suggestInvoiceClassification(input: {
  organizationNip?: string | null;
  sellerNip?: string | null;
  buyerNip?: string | null;
}): InvoiceClassification | null {
  const org = normalizeNipDigits(input.organizationNip);
  const seller = normalizeNipDigits(input.sellerNip);
  const buyer = normalizeNipDigits(input.buyerNip);
  if (!org) return null;
  if (seller === org) return "INCOME";
  if (buyer === org) return "EXPENSE";
  return null;
}

export function resolveInvoiceClassification(input: {
  organizationNip?: string | null;
  sellerNip?: string | null;
  buyerNip?: string | null;
  explicit?: InvoiceClassification | null;
}): InvoiceClassification {
  if (input.explicit === "INCOME" || input.explicit === "EXPENSE") return input.explicit;
  return suggestInvoiceClassification(input) ?? "EXPENSE";
}

export const CLASSIFICATION_LABELS: Record<InvoiceClassification, string> = {
  INCOME: "Faktura przychodowa",
  EXPENSE: "Faktura kosztowa",
};
