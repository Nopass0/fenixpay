-- Enum "IdeaStatus" already exists from previous migration, skip creation

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MessageType" AS ENUM ('SYSTEM', 'TRANSACTION', 'PAYOUT', 'ACCOUNT', 'SECURITY', 'DISPUTE', 'DEPOSIT', 'WITHDRAWAL', 'DEVICE', 'ANNOUNCEMENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "MessagePriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'CHECKING', 'CONFIRMED', 'FAILED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DepositType" AS ENUM ('BALANCE', 'INSURANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "WithdrawalBalanceType" AS ENUM ('TRUST', 'COMPENSATION', 'PROFIT_DEALS', 'PROFIT_PAYOUTS', 'REFERRAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "UserType" AS ENUM ('TRADER', 'MERCHANT', 'AGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_REPLY', 'RESOLVED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SupportTicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "DealDisputeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED_SUCCESS', 'RESOLVED_FAIL', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Agent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trcWallet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,

    CONSTRAINT "AgentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentTrader" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTrader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgentPayout" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paidAt" TIMESTAMP(3),
    "txHash" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "earnings" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AppVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportTicket" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "userType" "UserType" NOT NULL,
    "userId" TEXT,
    "merchantId" TEXT,
    "agentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isFromSupport" BOOLEAN NOT NULL DEFAULT false,
    "authorName" TEXT,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'SYSTEM',
    "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "relatedEntityId" TEXT,
    "relatedEntity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MessageAttachment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DepositRequest" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "amountUSDT" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "txHash" TEXT,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "type" "DepositType" NOT NULL DEFAULT 'BALANCE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "DepositRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "amountUSDT" DOUBLE PRECISION NOT NULL,
    "balanceType" "WithdrawalBalanceType" NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "network" TEXT NOT NULL DEFAULT 'TRC-20',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "rejectionReason" TEXT,
    "txHash" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TraderMerchant" (
    "id" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "methodId" TEXT NOT NULL,
    "feeIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "feeOut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isFeeInEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isFeeOutEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isMerchantEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TraderMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ServiceConfig" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "serviceKey" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DealDispute" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "dealId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "traderId" TEXT NOT NULL,
    "status" "DealDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolution" TEXT,

    CONSTRAINT "DealDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DealDisputeMessage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderType" "DisputeSenderType" NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealDisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DealDisputeFile" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealDisputeFile_pkey" PRIMARY KEY ("id")
);

-- Table "Idea" already exists from previous migration, skip creation

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Agent_email_key" ON "Agent"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AgentSession_token_key" ON "AgentSession"("token");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Team_agentId_name_key" ON "Team"("agentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AgentTrader_agentId_traderId_key" ON "AgentTrader"("agentId", "traderId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AppVersion_version_key" ON "AppVersion"("version");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_userType_status_idx" ON "SupportTicket"("userType", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportTicket_createdAt_idx" ON "SupportTicket"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_traderId_isRead_idx" ON "Message"("traderId", "isRead");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_traderId_createdAt_idx" ON "Message"("traderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Message_relatedEntityId_relatedEntity_idx" ON "Message"("relatedEntityId", "relatedEntity");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepositRequest_traderId_idx" ON "DepositRequest"("traderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepositRequest_status_idx" ON "DepositRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DepositRequest_txHash_idx" ON "DepositRequest"("txHash");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_traderId_idx" ON "WithdrawalRequest"("traderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WithdrawalRequest_balanceType_idx" ON "WithdrawalRequest"("balanceType");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TraderMerchant_traderId_merchantId_methodId_key" ON "TraderMerchant"("traderId", "merchantId", "methodId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ServiceConfig_serviceKey_key" ON "ServiceConfig"("serviceKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealDispute_dealId_idx" ON "DealDispute"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DealDispute_dealId_key" ON "DealDispute"("dealId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealDispute_merchantId_idx" ON "DealDispute"("merchantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealDispute_traderId_idx" ON "DealDispute"("traderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealDispute_status_idx" ON "DealDispute"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealDisputeMessage_disputeId_idx" ON "DealDisputeMessage"("disputeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealDisputeMessage_senderId_idx" ON "DealDisputeMessage"("senderId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DealDisputeFile_messageId_idx" ON "DealDisputeFile"("messageId");

-- Indexes for "Idea" already exist from previous migration, skip creation

-- AddForeignKey
ALTER TABLE "AgentSession" ADD CONSTRAINT "AgentSession_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTrader" ADD CONSTRAINT "AgentTrader_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTrader" ADD CONSTRAINT "AgentTrader_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTrader" ADD CONSTRAINT "AgentTrader_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepositRequest" ADD CONSTRAINT "DepositRequest_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderMerchant" ADD CONSTRAINT "TraderMerchant_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderMerchant" ADD CONSTRAINT "TraderMerchant_methodId_fkey" FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraderMerchant" ADD CONSTRAINT "TraderMerchant_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDispute" ADD CONSTRAINT "DealDispute_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDispute" ADD CONSTRAINT "DealDispute_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDispute" ADD CONSTRAINT "DealDispute_traderId_fkey" FOREIGN KEY ("traderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDisputeMessage" ADD CONSTRAINT "DealDisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "DealDispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealDisputeFile" ADD CONSTRAINT "DealDisputeFile_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DealDisputeMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign key "Idea_userId_fkey" already exists from previous migration, skip creation