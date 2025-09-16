import { db } from "@/db";

async function addKkkOperation() {
  try {
    console.log("Adding KkkOperationType enum and columns...");
    
    // Execute raw SQL to add the enum and columns
    await db.$executeRaw`
      DO $$ BEGIN
        -- Create enum if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KkkOperationType') THEN
          CREATE TYPE "KkkOperationType" AS ENUM ('PLUS', 'MINUS');
        END IF;
      END $$;
    `;
    
    // Add column to RateSettings if table exists
    await db.$executeRaw`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'RateSettings') THEN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'RateSettings' AND column_name = 'kkkOperation') THEN
            ALTER TABLE "RateSettings" ADD COLUMN "kkkOperation" "KkkOperationType" NOT NULL DEFAULT 'MINUS';
          END IF;
        END IF;
      END $$;
    `;
    
    // Add column to Transaction
    await db.$executeRaw`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'kkkOperation') THEN
          ALTER TABLE "Transaction" ADD COLUMN "kkkOperation" "KkkOperationType";
        END IF;
      END $$;
    `;
    
    console.log("✅ Successfully added KkkOperationType enum and columns");
    
    // Check if RateSettings table exists
    const tableExists = await db.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'RateSettings'
      );
    `;
    
    console.log("RateSettings table exists:", tableExists);
    
  } catch (error) {
    console.error("Error adding KkkOperation:", error);
  } finally {
    await db.$disconnect();
  }
}

addKkkOperation();