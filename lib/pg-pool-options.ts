/**
 * Opcje `pg.Pool` dla `lib/prisma.ts` (driver adapter).
 * Dla hostów zdalnych (Supabase): domyślnie poluzowana weryfikacja TLS na Windows / za proxy.
 */

function isLocalPostgres(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.includes("127.0.0.1") || lower.includes("localhost");
}

function tlsStrict(): boolean {
  return process.env.DATABASE_SSL_STRICT === "1" || process.env.DATABASE_SSL_STRICT === "true";
}

export type PgPoolConnectionOptions = {
  connectionString: string;
  ssl?: { rejectUnauthorized: boolean };
};

export function getPgPoolOptionsFromConnectionString(raw: string): PgPoolConnectionOptions {
  const trimmed = raw.trim();
  if (isLocalPostgres(trimmed)) {
    return { connectionString: trimmed };
  }

  if (tlsStrict()) {
    let url = trimmed;
    if (!/sslmode=/i.test(url)) {
      url = `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
    }
    return { connectionString: url, ssl: { rejectUnauthorized: true } };
  }

  let url = trimmed.replace(/([?&])sslmode=require\b/gi, "$1sslmode=no-verify");
  if (!/sslmode=/i.test(url)) {
    url = `${url}${url.includes("?") ? "&" : "?"}sslmode=no-verify`;
  }
  return {
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  };
}
