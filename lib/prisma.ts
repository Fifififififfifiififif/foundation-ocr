import { statSync } from "fs";
import path from "path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import { normalizePoolerDatabaseUrl } from "@/lib/database-url";
import { getPgPoolOptionsFromConnectionString } from "@/lib/pg-pool-options";
import { Pool } from "pg";

const defaultLocalUrl = "postgresql://postgres:postgres@127.0.0.1:5432/foundation_ocr";

function rawDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || defaultLocalUrl;
}

function resolvedDatabaseUrl(): string {
  const raw = rawDatabaseUrl();
  if (/localhost|127\.0\.0\.1/i.test(raw)) return raw;
  return normalizePoolerDatabaseUrl(raw);
}

function poolConnectionConfig() {
  return getPgPoolOptionsFromConnectionString(resolvedDatabaseUrl());
}

/** In dev, invalidate cached PrismaClient when schema.prisma changes (after prisma generate). */
function prismaSchemaFingerprint(): string {
  if (process.env.NODE_ENV === "production") return "production";
  try {
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const generatedPath = path.join(process.cwd(), "generated", "prisma", "index.js");
    const schemaMtime = statSync(schemaPath).mtimeMs;
    let generatedMtime = 0;
    try {
      generatedMtime = statSync(generatedPath).mtimeMs;
    } catch {
      /* generated client not built yet */
    }
    return `${schemaMtime}:${generatedMtime}`;
  } catch {
    return "unknown";
  }
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  poolConfigKey: string | undefined;
  prismaSchemaFingerprint: string | undefined;
};

function poolConfigFingerprint(): string {
  return `${resolvedDatabaseUrl()}|${process.env.DATABASE_SSL_STRICT ?? ""}`;
}

function getPool(): Pool {
  const key = poolConfigFingerprint();
  if (globalForPrisma.pgPool && globalForPrisma.poolConfigKey !== key) {
    void globalForPrisma.pgPool.end().catch(() => {});
    globalForPrisma.pgPool = undefined;
  }
  if (!globalForPrisma.pgPool) {
    globalForPrisma.poolConfigKey = key;
    globalForPrisma.pgPool = new Pool({
      ...poolConnectionConfig(),
      max: Number(process.env.DATABASE_POOL_MAX ?? 1),
    });
  }
  return globalForPrisma.pgPool;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient(): PrismaClient {
  const fingerprint = prismaSchemaFingerprint();
  const cached = globalForPrisma.prisma;
  if (cached && globalForPrisma.prismaSchemaFingerprint === fingerprint) {
    return cached;
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
    globalForPrisma.prismaSchemaFingerprint = fingerprint;
  }
  return client;
}

export const prisma = getPrismaClient();

export default prisma;
