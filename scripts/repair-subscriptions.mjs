#!/usr/bin/env node
/**
 * Repairs subscription schema + Prisma client.
 * Run: node scripts/repair-subscriptions.mjs
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const migration = path.join(
  root,
  "prisma/migrations/20260524120000_subscription_entitlements/migration.sql",
);

console.log("→ prisma generate");
execSync("npx prisma generate", { stdio: "inherit" });

if (existsSync(migration)) {
  console.log("→ apply subscription DDL");
  execSync(`npx prisma db execute --file "${migration}"`, { stdio: "inherit" });
}

const aiPurge = path.join(
  root,
  "prisma/migrations/20260523120000_remove_ai_assistant_module/migration.sql",
);
if (existsSync(aiPurge)) {
  console.log("→ remove deprecated AI_ASSISTANT module rows");
  execSync(`npx prisma db execute --file "${aiPurge}"`, { stdio: "inherit" });
}

console.log("\nDone. Restart dev server (stop npm run dev, delete .next, start again).");
