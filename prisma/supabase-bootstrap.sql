-- Uruchom w Supabase → SQL Editor (Session mode / port 5432), NIE na transaction poolerze 6543.
-- Idempotentny bootstrap: organizacja + organizationId na user + usunięcie tabel Better Auth.

DO $$ BEGIN
  CREATE TYPE "OrganizationRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'MANAGER', 'USER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Moja organizacja',
    "tagline" TEXT,
    "logoPath" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#18181b',
    "fontColor" TEXT,
    "contactEmail" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "organizationInfo" TEXT,
    "nip" TEXT,
    "regon" TEXT,
    "krs" TEXT,
    "appLanguage" TEXT NOT NULL DEFAULT 'pl',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Warsaw',
    "dateFormat" TEXT NOT NULL DEFAULT 'dd.MM.yyyy',
    "currency" TEXT NOT NULL DEFAULT 'PLN',
    "emailAlertsGeneral" BOOLEAN NOT NULL DEFAULT true,
    "emailAlertsOcr" BOOLEAN NOT NULL DEFAULT true,
    "emailAlertsExport" BOOLEAN NOT NULL DEFAULT true,
    "sessionTimeoutMinutes" INTEGER NOT NULL DEFAULT 480,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "ocrEnabled" BOOLEAN NOT NULL DEFAULT true,
    "maxUploadBytes" INTEGER NOT NULL DEFAULT 10485760,
    "appearanceTheme" TEXT NOT NULL DEFAULT 'system',
    "sidebarStyle" TEXT NOT NULL DEFAULT 'default',
    "uiDensity" TEXT NOT NULL DEFAULT 'comfortable',
    "dashboardPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

INSERT INTO "organization" ("id", "name", "accentColor", "createdAt", "updatedAt")
SELECT 'org_default', 'Moja organizacja', '#18181b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "organization" WHERE "id" = 'org_default');

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "user" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;

CREATE INDEX IF NOT EXISTS "user_organizationId_idx" ON "user"("organizationId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_organizationId_fkey') THEN
    ALTER TABLE "user"
      ADD CONSTRAINT "user_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
ALTER TABLE "user" DROP COLUMN IF EXISTS "emailVerified";
