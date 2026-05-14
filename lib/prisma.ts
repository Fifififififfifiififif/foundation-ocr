import fs from "fs";
import path from "path";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";
import { getPgPoolOptionsFromConnectionString } from "@/lib/pg-pool-options";
import { Pool } from "pg";

const defaultLocalUrl = "postgresql://postgres:postgres@127.0.0.1:5432/foundation_ocr";

function rawDatabaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || defaultLocalUrl;
}

function poolConnectionConfig() {
  return getPgPoolOptionsFromConnectionString(rawDatabaseUrl());
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
  poolConfigKey: string | undefined;
  prismaPoolKey: string | undefined;
  /** Czas modyfikacji `generated/prisma/index.js` przy utworzeniu bieżącego klienta (tylko dev). */
  prismaClientBuiltAt: number | undefined;
};

function poolConfigFingerprint(): string {
  return `${rawDatabaseUrl()}|${process.env.DATABASE_SSL_STRICT ?? ""}`;
}

function generatedClientMtimeMs(): number {
  try {
    const marker = path.join(process.cwd(), "generated", "prisma", "index.js");
    return fs.statSync(marker).mtimeMs;
  } catch {
    return 0;
  }
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
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
  }
  return globalForPrisma.pgPool;
}

function instantiateClient(): PrismaClient {
  const adapter = new PrismaPg(getPool());
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (process.env.NODE_ENV !== "development") {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = instantiateClient();
      globalForPrisma.prismaPoolKey = poolConfigFingerprint();
    }
    return globalForPrisma.prisma;
  }

  const poolKey = poolConfigFingerprint();
  if (globalForPrisma.prisma && globalForPrisma.prismaPoolKey !== poolKey) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
    globalForPrisma.prismaClientBuiltAt = undefined;
  }

  const onDisk = generatedClientMtimeMs();
  const stale =
    globalForPrisma.prisma != null &&
    globalForPrisma.prismaClientBuiltAt != null &&
    onDisk > globalForPrisma.prismaClientBuiltAt;

  if (stale) {
    void globalForPrisma.prisma!.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = instantiateClient();
    globalForPrisma.prismaClientBuiltAt = onDisk;
    globalForPrisma.prismaPoolKey = poolKey;
  }

  return globalForPrisma.prisma;
}

/**
 * W dev po `npx prisma generate` plik `generated/prisma/index.js` ma nowszy mtime —
 * przy kolejnym użyciu klient zostanie odtworzony (bez ręcznego restartu serwera).
 * W produkcji singleton jak wcześniej.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client) as unknown;
    if (typeof value === "function") {
      return (value as (...a: unknown[]) => unknown).bind(client);
    }
    return value;
  },
}) as PrismaClient;

export default prisma;
