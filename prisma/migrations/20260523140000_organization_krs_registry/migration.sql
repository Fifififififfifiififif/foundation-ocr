-- Dane rejestrowe z KRS (weryfikacja organizacji)

ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "legalForm" TEXT;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "registryStatus" TEXT;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMP(3);
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "registryRawData" JSONB;
