import type { PlanLimits } from "@/src/modules/subscription/types";
import { formatPlanLimit } from "@/src/modules/subscription/plans";

const GB = 1024 * 1024 * 1024;

/** Wyświetlanie limitu magazynu (500 MB, 25 GB…). */
export function formatStorageLimit(bytes: number): string {
  if (bytes >= GB) {
    const gb = bytes / GB;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(0)} GB`;
  }
  const mb = Math.round(bytes / (1024 * 1024));
  return `${mb} MB`;
}

export function formatLimitValue(key: keyof PlanLimits, value: number): string {
  if (key === "maxStorageBytes") return formatStorageLimit(value);
  return formatPlanLimit(value);
}

/** Etykiety limitów do UI (kompatybilność wsteczna z maxDocuments). */
export function limitsForUi(limits: PlanLimits) {
  return {
    maxUsers: limits.maxUsers,
    maxDocuments: limits.maxDocumentsMonthly,
    maxOcrJobsMonthly: limits.maxOcrJobsMonthly,
    maxExportsMonthly: limits.maxExportsMonthly,
    maxStorageBytes: limits.maxStorageBytes,
  };
}

export function usageLabels() {
  return {
    users: "Użytkownicy",
    documents: "Dokumenty (ten miesiąc)",
    ocr: "Skany OCR (ten miesiąc)",
    exports: "Eksporty (ten miesiąc)",
  } as const;
}

export function formatUsageCap(used: number, max: number): string {
  if (max === 0) return `${used} / niedostępne`;
  return `${used} / ${formatPlanLimit(max)}`;
}
