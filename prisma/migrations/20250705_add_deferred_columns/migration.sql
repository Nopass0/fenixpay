-- Add columns that were deferred from earlier migrations
-- These columns are added after their respective tables are created in 20250704125747_initial_with_max_logs

-- Add counterpartyLimit to BankDetail (deferred from 20250210_add_counterparty_limit)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'BankDetail' AND column_name = 'counterpartyLimit'
    ) THEN
        ALTER TABLE "BankDetail" ADD COLUMN "counterpartyLimit" INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;