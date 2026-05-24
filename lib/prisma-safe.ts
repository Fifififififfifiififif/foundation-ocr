import { isPrismaMissingSchemaObject } from "@/lib/prisma-recoverable";

/** Wykonuje zapytanie Prisma; przy braku tabel/kolumn zwraca fallback (dev / przed migracją). */
export async function prismaSafe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (isPrismaMissingSchemaObject(e)) return fallback;
    throw e;
  }
}
