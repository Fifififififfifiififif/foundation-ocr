export type CalendarInvoice = {
  id: string;
  issueDate: string | null;
  paymentDate: string | null;
  invoiceNumber: string | null;
  amountGross: string | null;
  status: "draft" | "review" | "approved";
  contractorName: string;
  projectName: string;
  filePath: string;
  fileName: string;
  hasOcr: boolean;
};

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isOverdue(inv: CalendarInvoice): boolean {
  if (inv.status === "approved") return false;
  if (!inv.paymentDate) return false;
  const pay = new Date(inv.paymentDate);
  pay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return pay < today;
}

export function statusDotClass(status: CalendarInvoice["status"]): string {
  switch (status) {
    case "approved":
      return "bg-emerald-500";
    case "review":
      return "bg-amber-500";
    default:
      return "bg-zinc-400";
  }
}

export function ocrStatusLabel(hasOcr: boolean): string {
  return hasOcr ? "OCR: przetworzono" : "OCR: brak";
}

export function buildInvoicesByDay(invoices: CalendarInvoice[]): Map<string, CalendarInvoice[]> {
  const m = new Map<string, CalendarInvoice[]>();
  for (const inv of invoices) {
    if (!inv.issueDate) continue;
    const key = inv.issueDate.slice(0, 10);
    const arr = m.get(key) ?? [];
    arr.push(inv);
    m.set(key, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => (a.invoiceNumber ?? "").localeCompare(b.invoiceNumber ?? ""));
  }
  return m;
}
