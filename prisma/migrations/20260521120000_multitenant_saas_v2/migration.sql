-- Multi-tenant SaaS v2: OWNER role, org status, invites, per-user module permissions

CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended');
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'accepted', 'expired', 'revoked');

ALTER TYPE "OrganizationRole" ADD VALUE IF NOT EXISTS 'OWNER' BEFORE 'ADMIN';

ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'REPORTS';
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'PROJECTS';
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'CALENDAR';
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'EXPORTS';
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'ACCOUNTING';
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'APPROVALS';
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'AI_ASSISTANT';

ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "status" "OrganizationStatus" NOT NULL DEFAULT 'active';
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "suspendedReason" TEXT;

ALTER TABLE "organization_member" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS "invite_token" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
  "tokenHash" TEXT NOT NULL,
  "status" "InviteStatus" NOT NULL DEFAULT 'pending',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "invitedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invite_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "invite_token_tokenHash_key" ON "invite_token"("tokenHash");
CREATE INDEX IF NOT EXISTS "invite_token_organizationId_status_idx" ON "invite_token"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "invite_token_email_status_idx" ON "invite_token"("email", "status");

ALTER TABLE "invite_token" DROP CONSTRAINT IF EXISTS "invite_token_organizationId_fkey";
ALTER TABLE "invite_token" ADD CONSTRAINT "invite_token_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invite_token" DROP CONSTRAINT IF EXISTS "invite_token_invitedById_fkey";
ALTER TABLE "invite_token" ADD CONSTRAINT "invite_token_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "user_module_permission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moduleKey" "ModuleKey" NOT NULL,
  "granted" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_module_permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_module_permission_organizationId_userId_moduleKey_key"
  ON "user_module_permission"("organizationId", "userId", "moduleKey");
CREATE INDEX IF NOT EXISTS "user_module_permission_userId_organizationId_idx"
  ON "user_module_permission"("userId", "organizationId");

ALTER TABLE "user_module_permission" DROP CONSTRAINT IF EXISTS "user_module_permission_organizationId_fkey";
ALTER TABLE "user_module_permission" ADD CONSTRAINT "user_module_permission_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_module_permission" DROP CONSTRAINT IF EXISTS "user_module_permission_userId_fkey";
ALTER TABLE "user_module_permission" ADD CONSTRAINT "user_module_permission_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "organization_member_organizationId_isActive_idx"
  ON "organization_member"("organizationId", "isActive");
