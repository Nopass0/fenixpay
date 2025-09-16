-- Add sumToWriteOffUSDT field to Payout table
ALTER TABLE "Payout" ADD COLUMN "sumToWriteOffUSDT" DOUBLE PRECISION;

-- Update existing records to calculate sumToWriteOffUSDT
UPDATE "Payout" 
SET "sumToWriteOffUSDT" = "totalUsdt" 
WHERE "sumToWriteOffUSDT" IS NULL;