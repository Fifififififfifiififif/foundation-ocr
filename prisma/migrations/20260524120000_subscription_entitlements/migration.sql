-- SaaS subscription entitlements (statusy, billing, trial)

ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'suspended';

ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT NOT NULL DEFAULT 'monthly';

CREATE INDEX IF NOT EXISTS "subscription_status_currentPeriodEnd_idx"
  ON "subscription"("status", "currentPeriodEnd");
