-- AlterTable
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "previousTraderIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "isProcessed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Transaction" 
  ADD COLUMN IF NOT EXISTS "adjustedRate" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "calculatedCommission" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "callbackSent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "feeInPercent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "frozenUsdtAmount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "kkkPercent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "kkkOperation" "KkkOperationType";

-- AlterTable
ALTER TABLE "Device" 
  ADD COLUMN IF NOT EXISTS "emulated" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fcmToken" TEXT,
  ADD COLUMN IF NOT EXISTS "firstConnectionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "isWorking" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "lastActiveAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "webPushAuth" TEXT,
  ADD COLUMN IF NOT EXISTS "webPushEndpoint" TEXT,
  ADD COLUMN IF NOT EXISTS "webPushP256dh" TEXT;

-- AlterTable
ALTER TABLE "BankDetail" 
  ADD COLUMN IF NOT EXISTS "dailyTraffic" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "deviceId" TEXT,
  ADD COLUMN IF NOT EXISTS "monthlyTraffic" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable  
ALTER TABLE "RateSetting" ADD COLUMN IF NOT EXISTS "rapiraKkk" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "countInRubEquivalent" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_isProcessed_type_idx" ON "Notification"("isProcessed", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Device_emulated_isOnline_idx" ON "Device"("emulated", "isOnline");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Device_userId_pushEnabled_idx" ON "Device"("userId", "pushEnabled");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Device_token_key" ON "Device"("token");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankDetail" ADD CONSTRAINT "BankDetail_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;