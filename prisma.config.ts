import path from "path";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// For CLI operations (db push, migrate) use DIRECT_DATABASE_URL (port 5432).
// For runtime, the app uses DATABASE_URL (pooler, port 6543).
const direct = process.env.DIRECT_DATABASE_URL?.trim();
const migrateOnly = process.env.MIGRATE_DATABASE_URL?.trim();
const pooled = process.env.DATABASE_URL?.trim() ?? "";

const argvJoined = process.argv.join(" ");
const prismaTouchesDb =
  argvJoined.includes("migrate deploy") ||
  argvJoined.includes("migrate dev") ||
  argvJoined.includes("migrate reset") ||
  argvJoined.includes("migrate status") ||
  argvJoined.includes("db push") ||
  argvJoined.includes("db execute") ||
  argvJoined.includes("db pull");

if (prismaTouchesDb && !direct && !migrateOnly && pooled.includes("pooler.supabase.com") && pooled.includes(":6543")) {
  console.warn(
    "\n[prisma] Brak DIRECT_DATABASE_URL i MIGRATE_DATABASE_URL — używam DATABASE_URL (pooler :6543).\n" +
      "Na Supabase zalecany jest connection string Direct (db.*:5432) do migracji; na poolerze migracja czasem się zawiesi lub się nie uda.\n" +
      "Ustaw DIRECT_DATABASE_URL albo MIGRATE_DATABASE_URL (ten sam Direct URL, tylko na czas `npm run db:deploy`),\n" +
      "albo uruchom SQL z `prisma/migrations/*/migration.sql` w Supabase → SQL Editor.\n",
  );
}

const databaseUrl =
  (prismaTouchesDb && migrateOnly) ||
  direct ||
  pooled ||
  "postgresql://postgres:postgres@127.0.0.1:5432/foundation_ocr";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
