-- Remove unique constraint for customApiToken in Aggregator table
ALTER TABLE "Aggregator" DROP CONSTRAINT IF EXISTS "Aggregator_customApiToken_key";
