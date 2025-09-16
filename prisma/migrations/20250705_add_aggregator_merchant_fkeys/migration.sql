-- Add foreign keys for AggregatorMerchant table (deferred from 20250210_add_aggregator_merchants)
-- These are added after Merchant and Method tables are created in 20250704125747_initial_with_max_logs

-- Check if foreign key constraints exist before adding them
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AggregatorMerchant_merchantId_fkey'
    ) THEN
        ALTER TABLE "AggregatorMerchant" ADD CONSTRAINT "AggregatorMerchant_merchantId_fkey" 
        FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'AggregatorMerchant_methodId_fkey'
    ) THEN
        ALTER TABLE "AggregatorMerchant" ADD CONSTRAINT "AggregatorMerchant_methodId_fkey" 
        FOREIGN KEY ("methodId") REFERENCES "Method"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;