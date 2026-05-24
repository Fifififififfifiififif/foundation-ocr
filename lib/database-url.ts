/**
 * Supabase transaction pooler (PgBouncer, port 6543) + Prisma:
 * wymagane `pgbouncer=true` (wyłącza cache prepared statements po stronie Prisma)
 * oraz mały `connection_limit`, żeby nie wyczerpać limitu połączeń poolera.
 *
 * Lokalny Postgres (localhost) — bez zmian.
 */

function isLocalPostgres(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function hasQueryParam(url: string, key: string): boolean {
  return new RegExp(`[?&]${key}=`, "i").test(url);
}

function setQueryParam(url: string, key: string, value: string): string {
  if (hasQueryParam(url, key)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

/**
 * Supabase: migracje / DDL (`db push`, `migrate deploy`, `db execute`) na porcie 6543
 * często wiszą — session pooler (5432) jest stabilniejszy.
 */
export function databaseUrlForMigrations(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || isLocalPostgres(trimmed)) return trimmed;
  if (trimmed.includes("pooler.supabase.com:6543")) {
    return trimmed.replace(":6543/", ":5432/");
  }
  return trimmed;
}

/** Używane przy starcie `PrismaClient` i w `prisma.config.ts` (CLI runtime). */
export function normalizePoolerDatabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || isLocalPostgres(trimmed)) return trimmed;

  let out = trimmed;
  out = setQueryParam(out, "pgbouncer", "true");
  out = setQueryParam(out, "connection_limit", "1");
  return out;
}
