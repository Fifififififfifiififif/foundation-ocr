-- Indeksy wydajnościowe + uproszczenie user (bez auth-only kolumn)

ALTER TABLE "user" DROP COLUMN IF EXISTS "banReason";
ALTER TABLE "user" DROP COLUMN IF EXISTS "banExpires";

UPDATE "user" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;

ALTER TABLE "user" ALTER COLUMN "organizationId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "user_organizationId_role_idx" ON "user"("organizationId", "role");

CREATE INDEX IF NOT EXISTS "project_organizationId_name_idx" ON "project"("organizationId", "name");

CREATE INDEX IF NOT EXISTS "contractor_organizationId_nip_idx" ON "contractor"("organizationId", "nip");
CREATE INDEX IF NOT EXISTS "contractor_organizationId_name_idx" ON "contractor"("organizationId", "name");

CREATE INDEX IF NOT EXISTS "document_organizationId_createdAt_idx" ON "document"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "document_organizationId_updatedAt_idx" ON "document"("organizationId", "updatedAt");
CREATE INDEX IF NOT EXISTS "document_organizationId_issueDate_idx" ON "document"("organizationId", "issueDate");
CREATE INDEX IF NOT EXISTS "document_projectId_idx" ON "document"("projectId");
CREATE INDEX IF NOT EXISTS "document_contractorId_idx" ON "document"("contractorId");
CREATE INDEX IF NOT EXISTS "document_createdByUserId_idx" ON "document"("createdByUserId");

CREATE INDEX IF NOT EXISTS "document_history_documentId_createdAt_idx" ON "document_history"("documentId", "createdAt");
