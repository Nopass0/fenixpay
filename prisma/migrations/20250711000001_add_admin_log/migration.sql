-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminLog_adminId_idx" ON "AdminLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminLog_createdAt_idx" ON "AdminLog"("createdAt");