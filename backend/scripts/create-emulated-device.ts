#!/usr/bin/env tsx
import { db } from "../src/db"
import { randomBytes } from "crypto"

async function createEmulatedDevice(traderId: string, bankType: string = "SBERBANK") {
  try {
    // Generate a simple token
    const token = randomBytes(16).toString("hex")
    
    // Create the device
    const device = await db.device.create({
      data: {
        name: `Emulated Device (${bankType})`,
        token,
        emulated: true,
        isOnline: false,
        userId: traderId,
      }
    })
    
    console.log("✅ Created emulated device:")
    console.log(`   ID: ${device.id}`)
    console.log(`   Token: ${device.token}`)
    console.log(`   Name: ${device.name}`)
    console.log("")
    console.log("📋 Use this token as 'Device Code' in the emulator admin panel")
    
    // Check if trader has bank details for this bank
    const bankDetail = await db.bankDetail.findFirst({
      where: {
        userId: traderId,
        bankType: bankType as any,
        isArchived: false,
      }
    })
    
    if (bankDetail) {
      console.log(`✅ Found bank detail for ${bankType}`)
      
      // Link device to bank detail
      await db.bankDetail.update({
        where: { id: bankDetail.id },
        data: { deviceId: device.id }
      })
      
      console.log("✅ Linked device to bank detail")
    } else {
      console.log(`⚠️  No bank detail found for ${bankType}`)
      console.log("   Create bank details for this trader to receive notifications")
    }
    
  } catch (error) {
    console.error("❌ Error creating device:", error)
  } finally {
    await db.$disconnect()
  }
}

// Get trader ID from command line
const traderId = process.argv[2]
const bankType = process.argv[3] || "SBERBANK"

if (!traderId) {
  console.log("Usage: tsx scripts/create-emulated-device.ts <trader-id> [bank-type]")
  console.log("Example: tsx scripts/create-emulated-device.ts clxxxxx SBERBANK")
  process.exit(1)
}

createEmulatedDevice(traderId, bankType)