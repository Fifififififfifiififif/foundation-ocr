import { Prisma } from "@/generated/prisma";

/** Brak tabeli / kolumny względem schematu Prisma (typowo przed `migrate deploy`). */
export function isPrismaMissingSchemaObject(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2021" || e.code === "P2022") return true;
    const msg = typeof e.message === "string" ? e.message.toLowerCase() : "";
    if (msg.includes("does not exist") && (msg.includes("table") || msg.includes("relation") || msg.includes("column"))) {
      return true;
    }
    return false;
  }
  if (e && typeof e === "object" && "code" in e) {
    const code = String((e as { code: unknown }).code);
    if (code === "P2021" || code === "P2022") return true;
  }
  if (e instanceof Error) {
    const m = e.message.toLowerCase();
    if (m.includes("does not exist") && (m.includes("table") || m.includes("relation"))) return true;
  }
  return false;
}
