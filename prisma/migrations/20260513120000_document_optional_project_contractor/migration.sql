-- Make document → project / contractor relations optional (preserve existing rows).
ALTER TABLE "Document" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "Document" ALTER COLUMN "contractorId" DROP NOT NULL;
