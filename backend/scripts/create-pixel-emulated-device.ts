import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function createPixelEmulatedDevice() {
  try {
    // Use the Example Trader who already has devices
    const traderId = 'cmcrwr9rl0000ikklh2y555nq'
    
    // Generate a token
    const token = randomBytes(32).toString('hex')
    
    // Create the Pixel 7 Pro emulated device
    const device = await prisma.device.create({
      data: {
        name: 'Pixel 7 Pro (Emulated)',
        token: token,
        emulated: true,
        isOnline: false,
        userId: traderId,
      }
    })
    
    console.log('✅ Created Pixel 7 Pro emulated device:')
    console.log(`   ID: ${device.id}`)
    console.log(`   Name: ${device.name}`)
    console.log(`   Token: ${device.token}`)
    console.log(`   Emulated: ${device.emulated}`)
    console.log(`   User ID: ${device.userId}`)
    console.log('')
    console.log('📋 This is the token for the emulated device')
    
  } catch (error) {
    console.error('❌ Error creating device:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createPixelEmulatedDevice()