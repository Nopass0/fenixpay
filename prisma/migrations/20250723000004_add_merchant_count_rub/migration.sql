-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "countInRubEquivalent" BOOLEAN NOT NULL DEFAULT false;