-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SettleRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterEnum - Add new values if they don't exist
DO $$ BEGIN
    ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'ACTIVE';
    ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';  
    ALTER TYPE "PayoutStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SettleRequest" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "status" "SettleRequestStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "rejectionReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "exchangeRate" DOUBLE PRECISION,
    "usdtAmount" DOUBLE PRECISION,
    "tradeId" TEXT,
    "usdtEquivalent" DOUBLE PRECISION,
    "countInRubEquivalent" BOOLEAN NOT NULL DEFAULT false,
    "rateType" TEXT,
    "merchantRate" DOUBLE PRECISION,
    "settlementAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettleRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TransactionAttempt" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "merchant_emulator_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "details" JSONB,

    CONSTRAINT "merchant_emulator_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "packageName" TEXT;

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "methodId" TEXT DEFAULT NULL;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "profitAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "matchedNotificationId" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "merchantRate" DOUBLE PRECISION;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "traderProfit" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Device" DROP COLUMN IF EXISTS "bankDetailId";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SettleRequest_createdAt_idx" ON "SettleRequest"("createdAt");
CREATE INDEX IF NOT EXISTS "SettleRequest_merchantId_idx" ON "SettleRequest"("merchantId");
CREATE INDEX IF NOT EXISTS "SettleRequest_status_idx" ON "SettleRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TransactionAttempt_createdAt_idx" ON "TransactionAttempt"("createdAt");
CREATE INDEX IF NOT EXISTS "TransactionAttempt_merchantId_idx" ON "TransactionAttempt"("merchantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "merchant_emulator_logs_batch_id_idx" ON "merchant_emulator_logs"("batch_id");
CREATE INDEX IF NOT EXISTS "merchant_emulator_logs_merchant_id_idx" ON "merchant_emulator_logs"("merchant_id");
CREATE INDEX IF NOT EXISTS "merchant_emulator_logs_timestamp_idx" ON "merchant_emulator_logs"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payout_methodId_idx" ON "Payout"("methodId");

-- AddForeignKey
ALTER TABLE "SettleRequest" ADD CONSTRAINT "SettleRequest_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAttempt" ADD CONSTRAINT "TransactionAttempt_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionAttempt" ADD CONSTRAINT "TransactionAttempt_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_matchedNotificationId_fkey" FOREIGN KEY ("matchedNotificationId") REFERENCES "Notification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE SET NULL ON UPDATE CASCADE;