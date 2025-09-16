-- Add missing traderProfit column to Transaction table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Transaction' 
        AND column_name = 'traderProfit'
    ) THEN
        ALTER TABLE "Transaction" ADD COLUMN "traderProfit" DOUBLE PRECISION;
        RAISE NOTICE 'Column traderProfit added to Transaction table';
    ELSE
        RAISE NOTICE 'Column traderProfit already exists in Transaction table';
    END IF;
END $$;
EOF < /dev/null
