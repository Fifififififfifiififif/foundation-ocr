import type { InvoiceClassification, KsefDocumentStatus } from "@/generated/prisma";
import type { KsefInvoiceDirection, KsefInvoiceListItem } from "@/src/modules/ksef/types";

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v.replace(",", "."));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

export function mapKsefMetadataToInvoice(
  raw: unknown,
  direction: KsefInvoiceDirection,
): KsefInvoiceListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const ksefReference =
    pickString(o, "ksefReference", "ksefNumber", "referenceNumber", "invoiceReferenceNumber") ??
    pickString(o, "id");
  if (!ksefReference) return null;

  return {
    ksefReference,
    invoiceNumber: pickString(o, "invoiceNumber", "number"),
    issueDate: pickString(o, "issueDate", "invoicingDate"),
    sellerName: pickString(o, "sellerName", "subjectBy", "issuerName"),
    sellerNip: pickString(o, "sellerNip", "subjectByNip", "issuerNip"),
    buyerName: pickString(o, "buyerName", "subjectTo", "buyer"),
    buyerNip: pickString(o, "buyerNip", "subjectToNip"),
    amountNet: pickNumber(o, "netAmount", "amountNet"),
    amountVat: pickNumber(o, "vatAmount", "amountVat"),
    amountGross: pickNumber(o, "grossAmount", "amountGross"),
    status: pickString(o, "status", "processingStatus"),
  };
}

export function classificationForKsefDirection(direction: KsefInvoiceDirection): InvoiceClassification {
  return direction === "issued" ? "INCOME" : "EXPENSE";
}

export function mapKsefStatus(raw: string | null): KsefDocumentStatus {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("upo")) return "upo_available";
  if (s.includes("accept")) return "accepted";
  if (s.includes("reject")) return "rejected";
  if (s.includes("pend")) return "pending";
  return "imported";
}

/** Minimalny parser XML faktury KSeF (FA) — wartości nagłówkowe. */
export function parseKsefInvoiceXml(xml: string): Partial<KsefInvoiceListItem> {
  const text = (tag: string) => {
    const m = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, "i").exec(xml);
    return m?.[1]?.trim() ?? null;
  };
  return {
    invoiceNumber: text("P_2") ?? text("NrFaKorygowanej"),
    issueDate: text("P_1"),
    sellerNip: text("NIP"),
    amountGross: Number(text("P_15") ?? "") || null,
    amountNet: Number(text("P_13_1") ?? "") || null,
    amountVat: Number(text("P_14_1") ?? "") || null,
  };
}
