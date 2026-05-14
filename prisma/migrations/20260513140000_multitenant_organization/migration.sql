-- Multi-tenant: Organization replaces foundation_settings; domain tables scoped by organizationId.
-- Safe for existing DBs that have foundation_settings (id = default) and legacy user.role (lowercase strings).

CREATE TYPE "OrganizationRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'MANAGER', 'USER');

CREATE TABLE "organization" (
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

INSERT INTO "organization" (
    "id",
    "name",
    "tagline",
    "logoPath",
    "accentColor",
    "fontColor",
    "contactEmail",
    "address",
    "phone",
    "organizationInfo",
    "nip",
    "regon",
    "krs",
    "appLanguage",
    "timezone",
    "dateFormat",
    "currency",
    "emailAlertsGeneral",
    "emailAlertsOcr",
    "emailAlertsExport",
    "sessionTimeoutMinutes",
    "twoFactorEnabled",
    "ocrEnabled",
    "maxUploadBytes",
    "appearanceTheme",
    "sidebarStyle",
    "uiDensity",
    "dashboardPreferences",
    "createdAt",
    "updatedAt"
)
SELECT
    'org_default',
    COALESCE(NULLIF(TRIM("foundationName"), ''), 'Moja organizacja'),
    "tagline",
    "logoPath",
    "accentColor",
    "fontColor",
    "contactEmail",
    "address",
    "phone",
    "organizationInfo",
    "nip",
    "regon",
    "krs",
    "appLanguage",
    "timezone",
    "dateFormat",
    "currency",
    "emailAlertsGeneral",
    "emailAlertsOcr",
    "emailAlertsExport",
    "sessionTimeoutMinutes",
    "twoFactorEnabled",
    "ocrEnabled",
    "maxUploadBytes",
    "appearanceTheme",
    "sidebarStyle",
    "uiDensity",
    COALESCE("dashboardPreferences"::jsonb, '{}'::jsonb),
    "createdAt",
    "updatedAt"
FROM "foundation_settings"
WHERE "id" = 'default'
LIMIT 1;

INSERT INTO "organization" (
    "id",
    "name",
    "accentColor",
    "appLanguage",
    "timezone",
    "dateFormat",
    "currency",
    "emailAlertsGeneral",
    "emailAlertsOcr",
    "emailAlertsExport",
    "sessionTimeoutMinutes",
    "twoFactorEnabled",
    "ocrEnabled",
    "maxUploadBytes",
    "appearanceTheme",
    "sidebarStyle",
    "uiDensity",
    "dashboardPreferences",
    "createdAt",
    "updatedAt"
)
SELECT
    'org_default',
    'Moja organizacja',
    '#18181b',
    'pl',
    'Europe/Warsaw',
    'dd.MM.yyyy',
    'PLN',
    true,
    true,
    true,
    480,
    false,
    true,
    10485760,
    'system',
    'default',
    'comfortable',
    '{}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "organization" WHERE "id" = 'org_default');

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

UPDATE "user" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;

ALTER TABLE "user" ADD CONSTRAINT "user_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role_new" "OrganizationRole";

UPDATE "user" SET "role_new" = CASE LOWER(CAST("role" AS TEXT))
    WHEN 'admin' THEN 'ADMIN'::"OrganizationRole"
    WHEN 'accountant' THEN 'ACCOUNTANT'::"OrganizationRole"
    WHEN 'manager' THEN 'MANAGER'::"OrganizationRole"
    ELSE 'USER'::"OrganizationRole"
END;

ALTER TABLE "user" DROP COLUMN IF EXISTS "role";
ALTER TABLE "user" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'USER'::"OrganizationRole";
ALTER TABLE "user" ALTER COLUMN "role" SET NOT NULL;

WITH ranked AS (
    SELECT id, "organizationId",
           ROW_NUMBER() OVER (PARTITION BY "organizationId" ORDER BY "createdAt" ASC) AS rn
    FROM "user"
)
UPDATE "user" u
SET "role" = 'USER'::"OrganizationRole"
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

WITH firsts AS (
    SELECT DISTINCT ON ("organizationId") id
    FROM "user"
    ORDER BY "organizationId", "createdAt" ASC
)
UPDATE "user" u
SET "role" = 'ADMIN'::"OrganizationRole"
FROM firsts f
WHERE u.id = f.id;

ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "project" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
ALTER TABLE "project" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "project" ADD CONSTRAINT "project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "project_organizationId_idx" ON "project"("organizationId");

ALTER TABLE "contractor" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "contractor" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
ALTER TABLE "contractor" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "contractor" ADD CONSTRAINT "contractor_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "contractor_organizationId_idx" ON "contractor"("organizationId");

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "document" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;
ALTER TABLE "document" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "document" ADD CONSTRAINT "document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "document_organizationId_idx" ON "document"("organizationId");
CREATE INDEX IF NOT EXISTS "document_organizationId_archived_idx" ON "document"("organizationId", "archived");
CREATE INDEX IF NOT EXISTS "document_organizationId_status_idx" ON "document"("organizationId", "status");

ALTER TABLE "document_history" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "document_history" dh
SET "organizationId" = d."organizationId"
FROM "document" d
WHERE dh."documentId" = d.id AND dh."organizationId" IS NULL;
ALTER TABLE "document_history" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "document_history" ADD CONSTRAINT "document_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "document_history_organizationId_idx" ON "document_history"("organizationId");

ALTER TABLE "in_app_notification" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;
UPDATE "in_app_notification" n
SET "organizationId" = u."organizationId"
FROM "user" u
WHERE n."userId" = u.id AND n."organizationId" IS NULL;
ALTER TABLE "in_app_notification" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "in_app_notification" ADD CONSTRAINT "in_app_notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "in_app_notification_organizationId_idx" ON "in_app_notification"("organizationId");

DROP TABLE IF EXISTS "foundation_settings";
