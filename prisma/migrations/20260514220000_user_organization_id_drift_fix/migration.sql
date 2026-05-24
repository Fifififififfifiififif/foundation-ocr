-- Drift / częściowe migracje: Prisma oczekuje `user.organizationId` (multi-tenant).
-- Idempotentne względem DB, które już przeszły przez `20260513140000_multitenant_organization`.

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "organizationId" TEXT;

CREATE INDEX IF NOT EXISTS "user_organizationId_idx" ON "user"("organizationId");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organization'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_organizationId_fkey'
  ) THEN
    ALTER TABLE "user"
      ADD CONSTRAINT "user_organizationId_fkey"
      FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
