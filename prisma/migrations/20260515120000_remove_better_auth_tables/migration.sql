-- Drop Better Auth tables (session, account, verification)
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;

-- Remove auth-only column from user
ALTER TABLE "user" DROP COLUMN IF EXISTS "emailVerified";
