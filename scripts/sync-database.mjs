/**
 * Synchronizuje schemat Prisma z Supabase (Session pooler 5432 — DDL na 6543 często wisi).
 * Użycie: npm run db:sync
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const raw = process.env.DATABASE_URL?.trim();
if (!raw) {
  console.error("Brak DATABASE_URL w .env");
  process.exit(1);
}

let url = raw;
if (url.includes("pooler.supabase.com:6543")) {
  url = url.replace(":6543/", ":5432/");
  console.info("[db:sync] Używam Session pooler (port 5432) zamiast transaction pooler (6543).");
}

const env = { ...process.env, DATABASE_URL: url };

console.info("[db:sync] pre-push SQL (user.organizationId, drop legacy columns)…");
try {
  execSync("npx prisma db execute --file prisma/pre-push-fix.sql", { cwd: root, env, stdio: "inherit" });
} catch {
  console.warn("[db:sync] pre-push SQL pominięte (np. świeża baza).");
}

console.info("[db:sync] prisma db push…");
execSync("npx prisma db push --accept-data-loss", { cwd: root, env, stdio: "inherit" });

console.info("[db:sync] prisma migrate deploy…");
try {
  execSync("npx prisma migrate deploy", { cwd: root, env, stdio: "inherit" });
} catch (e) {
  console.error("[db:sync] migrate deploy nie powiodło się — napraw migracje przed produkcją.");
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}

console.info("[db:sync] purge deprecated modules (AI_ASSISTANT)…");
try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260523120000_remove_ai_assistant_module/migration.sql",
    { cwd: root, env, stdio: "inherit" },
  );
} catch {
  console.warn("[db:sync] AI_ASSISTANT purge pominięte.");
}

console.info("[db:sync] subscription entitlements SQL…");
try {
  execSync(
    "npx prisma db execute --file prisma/migrations/20260524120000_subscription_entitlements/migration.sql",
    { cwd: root, env, stdio: "inherit" },
  );
} catch {
  console.warn("[db:sync] subscription SQL pominięte (kolumny mogą już istnieć).");
}

console.info("[db:sync] prisma generate…");
execSync("npx prisma generate", { cwd: root, env, stdio: "inherit" });

console.info("[db:sync] prisma db seed…");
execSync("npm run db:seed", { cwd: root, env, stdio: "inherit" });

console.info("[db:sync] Gotowe.");
