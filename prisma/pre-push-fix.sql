UPDATE "user" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;

INSERT INTO "organization" ("id", "name", "accentColor", "createdAt", "updatedAt")
SELECT 'org_default', 'Moja organizacja', '#18181b', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "organization" WHERE "id" = 'org_default');

ALTER TABLE "user" DROP COLUMN IF EXISTS "banReason";
ALTER TABLE "user" DROP COLUMN IF EXISTS "banExpires";
