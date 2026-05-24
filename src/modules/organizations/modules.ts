import { Prisma, ModuleKey as ModuleKeyEnum } from "@/generated/prisma";
import type { ModuleKey } from "@/generated/prisma";
import prisma from "@/lib/prisma";

/** Moduły usunięte z produktu — nigdy nie były w UI. */
export const DEPRECATED_MODULE_KEYS = ["AI_ASSISTANT"] as const;

const KNOWN_MODULE_KEYS = new Set<string>(Object.values(ModuleKeyEnum));

/** Filtr Prisma — tylko klucze z enum (pomija AI_ASSISTANT w bazie). */
export function prismaValidModuleKeys(): ModuleKey[] {
  return Object.values(ModuleKeyEnum) as ModuleKey[];
}

export function isDeprecatedModuleKey(key: string): boolean {
  return (DEPRECATED_MODULE_KEYS as readonly string[]).includes(key);
}

export function parseModuleKey(raw: string): ModuleKey | null {
  if (isDeprecatedModuleKey(raw)) return null;
  if (KNOWN_MODULE_KEYS.has(raw)) return raw as ModuleKey;
  return null;
}

/** Usuwa wpisy modułu Asystent AI (pozostałość po wczesnym seedzie). */
export async function purgeDeprecatedModules(): Promise<void> {
  for (const deprecatedKey of DEPRECATED_MODULE_KEYS) {
    await prisma.$executeRaw`
      DELETE FROM "user_module_permission" WHERE "moduleKey"::text = ${deprecatedKey}
    `;
    await prisma.$executeRaw`
      DELETE FROM "usage" WHERE "moduleKey"::text = ${deprecatedKey}
    `;
    await prisma.$executeRaw`
      DELETE FROM "organization_module"
      WHERE "moduleId" IN (SELECT "id" FROM "module" WHERE "key"::text = ${deprecatedKey})
    `;
    await prisma.$executeRaw`
      DELETE FROM "permission" WHERE "moduleKey"::text = ${deprecatedKey}
    `;
    await prisma.$executeRaw`
      DELETE FROM "module" WHERE "key"::text = ${deprecatedKey}
    `;
  }
}

export async function ensureDeprecatedModulesPurged(): Promise<void> {
  const rows = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*)::bigint AS count FROM "module" WHERE "key"::text = 'AI_ASSISTANT'
  `;
  if (Number(rows[0]?.count ?? 0) > 0) {
    await purgeDeprecatedModules();
  }
}

/** Lista modułów platformy bez enumów wycofanych z Prisma (bezpieczne raw SQL). */
export async function listPlatformModuleRows(): Promise<{ id: string; key: ModuleKey }[]> {
  await ensureDeprecatedModulesPurged();
  const rows = await prisma.$queryRaw<{ id: string; key: string }[]>`
    SELECT id, "key"::text AS key FROM "module"
    WHERE "key"::text NOT IN (${Prisma.join(DEPRECATED_MODULE_KEYS)})
  `;
  return rows
    .map((r) => ({ id: r.id, key: parseModuleKey(r.key) }))
    .filter((r): r is { id: string; key: ModuleKey } => r.key != null);
}

/** Moduły organizacji (enabled + key) bez deserializacji AI_ASSISTANT. */
export async function listOrganizationModuleRows(
  organizationId: string,
): Promise<{ enabled: boolean; key: ModuleKey }[]> {
  await ensureDeprecatedModulesPurged();
  const rows = await prisma.$queryRaw<{ enabled: boolean; key: string }[]>`
    SELECT om.enabled, m."key"::text AS key
    FROM "organization_module" om
    INNER JOIN "module" m ON m.id = om."moduleId"
    WHERE om."organizationId" = ${organizationId}
      AND m."key"::text NOT IN (${Prisma.join(DEPRECATED_MODULE_KEYS)})
  `;
  return rows
    .map((r) => ({ enabled: r.enabled, key: parseModuleKey(r.key) }))
    .filter((r): r is { enabled: boolean; key: ModuleKey } => r.key != null);
}

const DEFAULT_MODULES: { key: ModuleKey; name: string; description: string; isCore: boolean }[] = [
  { key: "AUTH", name: "Uwierzytelnianie", description: "Logowanie i sesje", isCore: true },
  { key: "OCR", name: "OCR", description: "Rozpoznawanie faktur", isCore: false },
  { key: "INVOICES", name: "Faktury", description: "Faktury i rozliczenia", isCore: true },
  { key: "DOCUMENTS", name: "Dokumenty", description: "Zarządzanie dokumentami", isCore: true },
  { key: "ANALYTICS", name: "Analityka", description: "Raporty i statystyki", isCore: false },
  { key: "USERS", name: "Użytkownicy", description: "Zarządzanie zespołem", isCore: true },
  { key: "PERMISSIONS", name: "Uprawnienia", description: "Role i dostęp", isCore: true },
  { key: "SETTINGS", name: "Ustawienia", description: "Konfiguracja organizacji", isCore: true },
  { key: "BILLING", name: "Subskrypcja", description: "Plany i limity", isCore: false },
  { key: "AUDIT", name: "Audyt", description: "Dziennik zdarzeń", isCore: false },
  { key: "UPLOAD", name: "Przesyłanie", description: "Pliki i storage", isCore: true },
  { key: "REPORTS", name: "Raporty", description: "Raporty i zestawienia", isCore: false },
  { key: "PROJECTS", name: "Projekty", description: "Projekty i granty", isCore: false },
  { key: "CALENDAR", name: "Kalendarz", description: "Terminy i kalendarz", isCore: false },
  { key: "EXPORTS", name: "Eksporty", description: "Eksport danych", isCore: false },
  { key: "ACCOUNTING", name: "Księgowość", description: "Paczki dla księgowości", isCore: false },
  { key: "APPROVALS", name: "Zatwierdzenia", description: "Workflow zatwierdzeń", isCore: false },
];

export async function seedPlatformModules() {
  await purgeDeprecatedModules();
  for (const m of DEFAULT_MODULES) {
    await prisma.module.upsert({
      where: { key: m.key },
      create: m,
      update: { name: m.name, description: m.description },
    });
  }
}

export async function seedOrganizationModules(organizationId: string) {
  await seedPlatformModules();
  const modules = await listPlatformModuleRows();
  for (const mod of modules) {
    await prisma.organizationModule.upsert({
      where: {
        organizationId_moduleId: { organizationId, moduleId: mod.id },
      },
      create: { organizationId, moduleId: mod.id, enabled: true },
      update: {},
    });
  }
}

export async function setOrganizationModuleEnabled(
  organizationId: string,
  moduleKey: ModuleKey,
  enabled: boolean,
) {
  const mod = await prisma.module.findUnique({ where: { key: moduleKey } });
  if (!mod) throw new Error(`Module ${moduleKey} not found`);
  await prisma.organizationModule.upsert({
    where: { organizationId_moduleId: { organizationId, moduleId: mod.id } },
    create: { organizationId, moduleId: mod.id, enabled },
    update: { enabled, disabledAt: enabled ? null : new Date() },
  });
}
