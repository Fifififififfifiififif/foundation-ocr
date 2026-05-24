/** Polish labels for enum-like values shown in the UI (internal values stay English). */

import { formatMoneyPl } from "@/lib/format/money";

export function documentStatusPl(status: string): string {
  switch (status) {
    case "draft":
      return "Szkic";
    case "review":
      return "Do weryfikacji";
    case "approved":
      return "Zatwierdzony";
    default:
      return status;
  }
}

export function auditValuePl(fieldName: string, value: string | null): string {
  if (value === null) return "—";
  if (fieldName === "status") return documentStatusPl(value);
  if (
    (fieldName === "amountNet" ||
      fieldName === "amountVat" ||
      fieldName === "amountGross") &&
    value
  ) {
    const n = Number(value);
    if (Number.isFinite(n)) return formatMoneyPl(n);
  }
  return value;
}

export function auditFieldPl(fieldName: string): string {
  const map: Record<string, string> = {
    invoiceNumber: "Numer faktury",
    issueDate: "Data wystawienia",
    paymentDate: "Data płatności",
    amountNet: "Kwota netto",
    amountVat: "Kwota VAT",
    amountGross: "Kwota brutto",
    documentType: "Rodzaj dokumentu",
    ocrVendorName: "Sprzedawca (OCR)",
    ocrContractorNip: "NIP na dokumencie (OCR)",
    ocrBankAccount: "Rachunek bankowy (OCR)",
    expenseCategory: "Kategoria wydatku",
    notes: "Uwagi",
    status: "Status",
    contractorId: "Kontrahent",
    projectId: "Projekt",
  };
  return map[fieldName] ?? fieldName;
}

/** Etykieta roli w organizacji (enum Prisma). */
export function organizationRolePl(role: string | null | undefined): string {
  switch (role) {
    case "OWNER":
      return "Właściciel organizacji";
    case "ADMIN":
      return "Administrator";
    case "ACCOUNTANT":
      return "Księgowy";
    case "MANAGER":
      return "Menedżer";
    case "MEMBER":
      return "Członek";
    case "VIEWER":
      return "Podgląd";
    case "USER":
      return "Użytkownik";
    default:
      return role?.trim() ? role : "Użytkownik";
  }
}
