-- Idempotent repair: finance + KSeF columns (safe to re-run)

DO $$ BEGIN
  CREATE TYPE "InvoiceClassification" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "KsefEnvironment" AS ENUM ('test', 'prod');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "KsefIntegrationStatus" AS ENUM ('disconnected', 'connected', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "KsefDocumentStatus" AS ENUM ('imported', 'pending', 'accepted', 'rejected', 'upo_available');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "DocumentSource" ADD VALUE IF NOT EXISTS 'ksef';

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "classification" "InvoiceClassification" NOT NULL DEFAULT 'EXPENSE';
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "isCommitment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ksefReference" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ksefStatus" "KsefDocumentStatus";
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ksefRawXml" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "ksefUpoReference" TEXT;

CREATE INDEX IF NOT EXISTS "document_organizationId_classification_idx" ON "document"("organizationId", "classification");
CREATE INDEX IF NOT EXISTS "document_organizationId_ksefReference_idx" ON "document"("organizationId", "ksefReference");
CREATE UNIQUE INDEX IF NOT EXISTS "document_organizationId_ksefReference_key" ON "document"("organizationId", "ksefReference") WHERE "ksefReference" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "organization_financial_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reservedCommitments" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_financial_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_financial_settings_organizationId_key" ON "organization_financial_settings"("organizationId");

CREATE TABLE IF NOT EXISTS "bank_account" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iban" TEXT,
    "accountNumber" TEXT,
    "openingBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currentBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "bank_account_organizationId_isPrimary_idx" ON "bank_account"("organizationId", "isPrimary");

CREATE TABLE IF NOT EXISTS "ksef_integration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "environment" "KsefEnvironment" NOT NULL DEFAULT 'test',
    "status" "KsefIntegrationStatus" NOT NULL DEFAULT 'disconnected',
    "nip" TEXT,
    "tokenEncrypted" TEXT,
    "certificateEncrypted" TEXT,
    "authMetadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncMessage" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ksef_integration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ksef_integration_organizationId_key" ON "ksef_integration"("organizationId");

CREATE TABLE IF NOT EXISTS "financial_summary_cache" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "incomeTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenseTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "profitTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "accountBalance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "commitments" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "availableFunds" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_summary_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "financial_summary_cache_organizationId_key" ON "financial_summary_cache"("organizationId");

DO $$ BEGIN
  ALTER TABLE "organization_financial_settings" ADD CONSTRAINT "organization_financial_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "ksef_integration" ADD CONSTRAINT "ksef_integration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "financial_summary_cache" ADD CONSTRAINT "financial_summary_cache_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
