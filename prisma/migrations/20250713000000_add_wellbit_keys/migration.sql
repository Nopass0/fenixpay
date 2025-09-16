-- Add API key fields for Wellbit integration
ALTER TABLE "Merchant" ADD COLUMN "apiKeyPublic" TEXT;
ALTER TABLE "Merchant" ADD COLUMN "apiKeyPrivate" TEXT;

-- Ensure uniqueness of public key if provided
CREATE UNIQUE INDEX IF NOT EXISTS "Merchant_apiKeyPublic_key" ON "Merchant" ("apiKeyPublic");
