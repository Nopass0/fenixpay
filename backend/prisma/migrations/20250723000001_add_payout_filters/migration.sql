-- CreateTable
CREATE TABLE "PayoutFilters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trafficTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bankTypes" "BankType"[] DEFAULT ARRAY[]::"BankType"[],
    "maxPayoutAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutFilters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PayoutFilters_userId_key" ON "PayoutFilters"("userId");

-- AddForeignKey
ALTER TABLE "PayoutFilters" ADD CONSTRAINT "PayoutFilters_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;