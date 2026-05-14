import { format } from "date-fns";

import { documentStatusPl } from "@/lib/ui-i18n";
import { UNASSIGNED_LABEL } from "@/lib/optional-relation-ids";

type DocRow = {
  invoiceNumber: string | null;
  issueDate: Date | null;
  paymentDate: Date | null;
  amountNet: { toString(): string } | null;
  amountVat: { toString(): string } | null;
  amountGross: { toString(): string } | null;
  documentType: string | null;
  ocrVendorName: string | null;
  ocrContractorNip: string | null;
  status: string;
  contractor: { name: string; nip: string };
  project: { name: string; grantNumber: string; fundingSource: string };
};

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function documentsToCsv(rows: DocRow[]): string {
  const header = [
    "numer_faktury",
    "data_wystawienia",
    "data_platnosci",
    "kwota_netto",
    "kwota_vat",
    "kwota_brutto",
    "rodzaj_dokumentu",
    "sprzedawca_ocr",
    "nip_na_dokumencie",
    "status",
    "kontrahent",
    "nip_kontrahenta",
    "projekt",
    "numer_grantu",
    "zrodlo_finansowania",
  ];

  const lines = [header.join(",")];

  for (const r of rows) {
    const cells = [
      r.invoiceNumber ?? "",
      r.issueDate ? format(r.issueDate, "yyyy-MM-dd") : "",
      r.paymentDate ? format(r.paymentDate, "yyyy-MM-dd") : "",
      r.amountNet != null ? String(r.amountNet) : "",
      r.amountVat != null ? String(r.amountVat) : "",
      r.amountGross != null ? String(r.amountGross) : "",
      r.documentType ?? "",
      r.ocrVendorName ?? "",
      r.ocrContractorNip ?? "",
      documentStatusPl(r.status),
      r.contractor.name || UNASSIGNED_LABEL,
      r.contractor.nip,
      r.project.name || UNASSIGNED_LABEL,
      r.project.grantNumber,
      r.project.fundingSource,
    ].map((c) => escapeCsv(c));

    lines.push(cells.join(","));
  }

  return lines.join("\n");
}
