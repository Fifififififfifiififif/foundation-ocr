import path from "path";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

import { databaseUrlForMigrations, normalizePoolerDatabaseUrl } from "./lib/database-url";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const pooled = process.env.DATABASE_URL?.trim() ?? "";
const fallback = "postgresql://postgres:postgres@127.0.0.1:5432/foundation_ocr";

const argvJoined = process.argv.join(" ");
const prismaTouchesDb =
  argvJoined.includes("migrate deploy") ||
  argvJoined.includes("migrate dev") ||
  argvJoined.includes("migrate reset") ||
  argvJoined.includes("migrate status") ||
  argvJoined.includes("migrate resolve") ||
  argvJoined.includes("db push") ||
  argvJoined.includes("db execute") ||
  argvJoined.includes("db pull");

const databaseUrl = pooled
  ? prismaTouchesDb
    ? databaseUrlForMigrations(pooled)
    : normalizePoolerDatabaseUrl(pooled)
  : fallback;

if (prismaTouchesDb && pooled.includes("pooler.supabase.com:6543")) {
  console.info(
    "\n[prisma] Migracje DDL: session pooler (port 5432). Runtime aplikacji nadal może używać :6543 z .env.\n",
  );
}

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
