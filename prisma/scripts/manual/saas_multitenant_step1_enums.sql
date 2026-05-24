-- Step 1: new enum types and OrganizationRole values (must commit before use)
CREATE TYPE "DocumentSource" AS ENUM ('ocr', 'manual', 'hybrid');
CREATE TYPE "ModuleKey" AS ENUM ('AUTH', 'OCR', 'INVOICES', 'DOCUMENTS', 'ANALYTICS', 'USERS', 'PERMISSIONS', 'SETTINGS', 'BILLING', 'AUDIT', 'UPLOAD');
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled');
CREATE TYPE "SystemRoleKey" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');

ALTER TYPE "OrganizationRole" ADD VALUE IF NOT EXISTS 'MEMBER';
ALTER TYPE "OrganizationRole" ADD VALUE IF NOT EXISTS 'VIEWER';
