/**
 * Test połączenia z PostgreSQL (bez importu @/ — działa jako zwykły skrypt Node).
 * Użycie: npm run db:test  lub  node scripts/test-db-connection.mjs
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

let url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error(JSON.stringify({ status: "ERROR", message: "Brak DATABASE_URL w .env" }, null, 2));
  process.exit(1);
}

if (url.includes("pooler.supabase.com:6543")) {
  url = url.replace(":6543/", ":5432/");
}

const client = new pg.Client({ connectionString: url });

try {
  await client.connect();
  await client.query("SELECT 1 AS ok");
  const org = await client.query(`SELECT id, name FROM organization WHERE id = 'org_default' LIMIT 1`);
  const users = await client.query(`SELECT COUNT(*)::int AS c FROM "user"`);
  const docs = await client.query(`SELECT COUNT(*)::int AS c FROM document`);

  console.log(
    JSON.stringify(
      {
        status: "OK",
        provider: url.includes("supabase") ? "Supabase" : "PostgreSQL",
        organization: org.rows[0] ?? null,
        userCount: users.rows[0]?.c ?? 0,
        documentCount: docs.rows[0]?.c ?? 0,
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.error(
    JSON.stringify(
      { status: "ERROR", message: e instanceof Error ? e.message : String(e) },
      null,
      2,
    ),
  );
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
