-- CreateEnum
CREATE TYPE "PayoutDirection" AS ENUM ('IN', 'OUT');

-- AlterTable
ALTER TABLE "Payout" 
ADD COLUMN "direction" "PayoutDirection" NOT NULL DEFAULT 'OUT',
ADD COLUMN "merchantRate" DOUBLE PRECISION,
ADD COLUMN "rateDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "feePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "cancelReasonCode" TEXT,
ADD COLUMN "externalReference" TEXT;

-- CreateTable
CREATE TABLE "PayoutRateAudit" (
    "id" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "oldRateDelta" DOUBLE PRECISION NOT NULL,
    "newRateDelta" DOUBLE PRECISION NOT NULL,
    "oldFeePercent" DOUBLE PRECISION NOT NULL,
    "newFeePercent" DOUBLE PRECISION NOT NULL,
    "adminId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayoutRateAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "chatId" TEXT,
    "isLinked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "linkedAt" TIMESTAMP(3),

    CONSTRAINT "TelegramLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PayoutRateAudit_payoutId_idx" ON "PayoutRateAudit"("payoutId");

-- CreateIndex
CREATE INDEX "PayoutRateAudit_timestamp_idx" ON "PayoutRateAudit"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_userId_key" ON "TelegramLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_code_key" ON "TelegramLink"("code");

-- CreateIndex
CREATE INDEX "TelegramLink_code_idx" ON "TelegramLink"("code");

-- CreateIndex
CREATE INDEX "TelegramLink_expiresAt_idx" ON "TelegramLink"("expiresAt");

-- CreateIndex
CREATE INDEX "Payout_direction_status_idx" ON "Payout"("direction", "status");

-- AddForeignKey
ALTER TABLE "PayoutRateAudit" ADD CONSTRAINT "PayoutRateAudit_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data migration: set merchantRate to current rate for existing payouts
UPDATE "Payout" SET "merchantRate" = "rate" WHERE "merchantRate" IS NULL;