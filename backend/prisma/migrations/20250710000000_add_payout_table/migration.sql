-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('CREATED', 'AVAILABLE', 'PROCESSING', 'CHECKING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED', 'DISPUTE');

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "numericId" SERIAL NOT NULL,
    "merchantId" TEXT NOT NULL,
    "traderId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountUsdt" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "totalUsdt" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "wallet" TEXT NOT NULL,
    "bank" TEXT NOT NULL,
    "isCard" BOOLEAN NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "expireAt" TIMESTAMP(3) NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "proofFiles" TEXT[],
    "disputeFiles" TEXT[],
    "disputeMessage" TEXT,
    "cancelReason" TEXT,
    "merchantWebhookUrl" TEXT,
    "merchantMetadata" JSONB,
    "acceptanceTime" INTEGER NOT NULL DEFAULT 5,
    "processingTime" INTEGER NOT NULL DEFAULT 15,
    "pushNotificationTime" INTEGER,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payout_numericId_key" ON "Payout"("numericId");

-- CreateIndex
CREATE INDEX "Payout_status_traderId_idx" ON "Payout"("status", "traderId");

-- CreateIndex
CREATE INDEX "Payout_merchantId_status_idx" ON "Payout"("merchantId", "status");

-- CreateIndex
CREATE INDEX "Payout_createdAt_idx" ON "Payout"("createdAt");

-- CreateIndex
CREATE INDEX "Payout_expireAt_idx" ON "Payout"("expireAt");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;