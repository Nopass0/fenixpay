-- CreateEnum (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KkkOperationType') THEN
        CREATE TYPE "KkkOperationType" AS ENUM ('PLUS', 'MINUS');
    END IF;
END $$;

-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "RateSettings" (
    "id" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "kkkPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
CREATE UNIQUE INDEX IF NOT EXISTS "RateSettings_methodId_key" ON "RateSettings"("methodId");

-- AddForeignKey (if not exists and if Method table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Method' 
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'RateSettings_methodId_fkey'
    ) THEN
        ALTER TABLE "RateSettings" ADD CONSTRAINT "RateSettings_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- AlterTable (add column if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'RateSettings' 
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'RateSettings' 
        AND column_name = 'kkkOperation'
    ) THEN
        ALTER TABLE "RateSettings" ADD COLUMN "kkkOperation" "KkkOperationType" NOT NULL DEFAULT 'MINUS';
    END IF;
END $$;

-- AlterTable (add column if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'Transaction' 
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Transaction' 
        AND column_name = 'kkkOperation'
    ) THEN
        ALTER TABLE "Transaction" ADD COLUMN "kkkOperation" "KkkOperationType";
    END IF;
END $$;