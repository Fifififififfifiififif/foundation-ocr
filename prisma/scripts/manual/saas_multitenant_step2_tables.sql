-- Step 2: tables, columns, indexes, FKs (run after step 1 enums committed)

ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "slug" TEXT;
UPDATE "organization" SET "slug" = 'org-' || "id" WHERE "slug" IS NULL;
ALTER TABLE "organization" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "organization_slug_key" ON "organization"("slug");

CREATE TABLE IF NOT EXISTS "module" (
    "id" TEXT NOT NULL,
    "key" "ModuleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "module_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "module_key_key" ON "module"("key");

CREATE TABLE IF NOT EXISTS "permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "moduleKey" "ModuleKey",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "permission_key_key" ON "permission"("key");

CREATE TABLE IF NOT EXISTS "role" (
    "id" TEXT NOT NULL,
    "key" "SystemRoleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "role_key_key" ON "role"("key");

CREATE TABLE IF NOT EXISTS "role_permission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("roleId","permissionId")
);

CREATE TABLE IF NOT EXISTS "organization_member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_member_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_member_organizationId_userId_key" ON "organization_member"("organizationId", "userId");

CREATE TABLE IF NOT EXISTS "organization_module" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabledAt" TIMESTAMP(3),
    CONSTRAINT "organization_module_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "organization_module_organizationId_moduleId_key" ON "organization_module"("organizationId", "moduleId");

CREATE TABLE IF NOT EXISTS "subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'starter',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "seats" INTEGER NOT NULL DEFAULT 5,
    "ocrQuotaMonthly" INTEGER NOT NULL DEFAULT 500,
    "storageBytes" BIGINT NOT NULL DEFAULT 10737418240,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_organizationId_key" ON "subscription"("organizationId");

CREATE TABLE IF NOT EXISTS "usage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "moduleKey" "ModuleKey" NOT NULL,
    "metric" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "usage_organizationId_moduleKey_metric_periodStart_key" ON "usage"("organizationId", "moduleKey", "metric", "periodStart");

CREATE TABLE IF NOT EXISTS "audit_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "upload" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "upload_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_line_item" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "unitPrice" DECIMAL(14,2),
    "vatRate" DECIMAL(5,2),
    "netAmount" DECIMAL(14,2),
    "vatAmount" DECIMAL(14,2),
    "grossAmount" DECIMAL(14,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "document_line_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ocr_result" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "rawText" TEXT,
    "parsedJson" JSONB,
    "meanConfidence" INTEGER,
    "parsingConfidence" INTEGER,
    "language" TEXT,
    "engine" TEXT DEFAULT 'tesseract',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ocr_result_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ocr_result_documentId_key" ON "ocr_result"("documentId");

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "supabaseUserId" TEXT;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ALTER COLUMN "organizationId" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "user_supabaseUserId_key" ON "user"("supabaseUserId");

ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "source" "DocumentSource" NOT NULL DEFAULT 'ocr';
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'PLN';
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "sellerName" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "sellerNip" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "sellerAddress" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "sellerEmail" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "sellerPhone" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "buyerName" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "buyerNip" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "buyerAddress" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "iban" TEXT;
ALTER TABLE "document" ADD COLUMN IF NOT EXISTS "uploadId" TEXT;
ALTER TABLE "document" ALTER COLUMN "filePath" DROP NOT NULL;
ALTER TABLE "document" ALTER COLUMN "fileName" DROP NOT NULL;
ALTER TABLE "document" ALTER COLUMN "mimeType" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "document_uploadId_key" ON "document"("uploadId");
CREATE INDEX IF NOT EXISTS "document_organizationId_source_idx" ON "document"("organizationId", "source");

DO $$ BEGIN
  ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "organization_module" ADD CONSTRAINT "organization_module_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "organization_module" ADD CONSTRAINT "organization_module_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "subscription" ADD CONSTRAINT "subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "usage" ADD CONSTRAINT "usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "upload" ADD CONSTRAINT "upload_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "upload" ADD CONSTRAINT "upload_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "document_line_item" ADD CONSTRAINT "document_line_item_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ocr_result" ADD CONSTRAINT "ocr_result_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "document" ADD CONSTRAINT "document_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

INSERT INTO "organization_member" ("id", "organizationId", "userId", "role", "createdAt", "updatedAt")
SELECT
  'om_' || u."id",
  u."organizationId",
  u."id",
  u."role",
  u."createdAt",
  u."updatedAt"
FROM "user" u
WHERE u."organizationId" IS NOT NULL
ON CONFLICT ("organizationId", "userId") DO NOTHING;

UPDATE "organization" SET "slug" = 'default' WHERE "id" = 'org_default' AND ("slug" IS NULL OR "slug" = 'org-org_default');
