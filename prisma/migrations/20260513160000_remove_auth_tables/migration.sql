-- Remove Better Auth tables (sessions, OAuth accounts, email verification tokens).
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "verification" CASCADE;
