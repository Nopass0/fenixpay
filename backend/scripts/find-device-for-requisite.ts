import { db } from "../src/db"

async function findDeviceForRequisite() {
  try {
    console.log("🔍 Searching for device linked to 'Тест Тестович' requisite...\n")
    
    // 1. Ищем реквизит по имени получателя
    const bankDetails = await db.bankDetail.findMany({
      where: {
        recipientName: {
          contains: "Тест",
          mode: 'insensitive'
        }
      },
      include: {
        user: true,
        device: true
      }
    })
    
    console.log(`📋 Found ${bankDetails.length} bank details matching 'Тест':`)
    
    for (const bd of bankDetails) {
      console.log(`\n💳 Bank Detail:`)
      console.log(`   ID: ${bd.id}`)
      console.log(`   Name: ${bd.recipientName}`)
      console.log(`   Bank: ${bd.bankType}`)
      console.log(`   Card: ${bd.cardNumber}`)
      console.log(`   Phone: ${bd.phoneNumber}`)
      console.log(`   User: ${bd.user.email}`)
      console.log(`   Device ID: ${bd.deviceId || 'Not linked'}`)
      console.log(`   Archived: ${bd.isArchived}`)
      
      if (bd.device) {
        console.log(`\n📱 Linked Device:`)
        console.log(`   ID: ${bd.device.id}`)
        console.log(`   Name: ${bd.device.name}`)
        console.log(`   Token: ${bd.device.token.substring(0, 16)}...`)
        console.log(`   User ID: ${bd.device.userId}`)
        console.log(`   Online: ${bd.device.isOnline}`)
        console.log(`   Emulated: ${bd.device.emulated}`)
        console.log(`   Created: ${bd.device.createdAt}`)
        console.log(`   Updated: ${bd.device.updatedAt}`)
        
        // Проверяем, принадлежит ли устройство тому же пользователю
        if (bd.device.userId !== bd.userId) {
          console.log(`   ⚠️  MISMATCH: Device belongs to user ${bd.device.userId}, but bank detail belongs to user ${bd.userId}`)
        } else {
          console.log(`   ✅ Device and bank detail belong to the same user`)
        }
      } else if (bd.deviceId) {
        console.log(`\n❌ Device ID exists (${bd.deviceId}) but device not found - ORPHANED REFERENCE`)
        
        // Проверяем, существует ли устройство в БД
        const orphanedDevice = await db.device.findUnique({
          where: { id: bd.deviceId }
        })
        
        if (orphanedDevice) {
          console.log(`   📱 Found orphaned device:`)
          console.log(`      ID: ${orphanedDevice.id}`)
          console.log(`      Name: ${orphanedDevice.name}`)
          console.log(`      User ID: ${orphanedDevice.userId}`)
          console.log(`      Online: ${orphanedDevice.isOnline}`)
        } else {
          console.log(`   🗑️  Device was deleted from DB but reference remains`)
        }
      }
    }
    
    // 2. Ищем все устройства с orphaned bank details
    console.log(`\n🔍 Checking for orphaned devices...`)
    
    const allDevices = await db.device.findMany({
      include: {
        user: true,
        bankDetails: true
      }
    })
    
    console.log(`\n📱 All devices in database (${allDevices.length}):`)
    
    for (const device of allDevices) {
      console.log(`\n   Device: ${device.name} (${device.id})`)
      console.log(`   User: ${device.user.email}`)
      console.log(`   Bank Details: ${device.bankDetails.length}`)
      
      if (device.bankDetails.length > 0) {
        device.bankDetails.forEach(bd => {
          console.log(`      - ${bd.recipientName} (${bd.bankType})`)
        })
      }
    }
    
    // 3. Ищем конкретно реквизиты с именем "Тестович"
    const testovichRequisites = await db.bankDetail.findMany({
      where: {
        recipientName: {
          contains: "Тестович",
          mode: 'insensitive'
        }
      },
      include: {
        user: true
      }
    })
    
    console.log(`\n🎯 Requisites with 'Тестович' (${testovichRequisites.length}):`)
    
    for (const req of testovichRequisites) {
      console.log(`\n   Requisite: ${req.recipientName}`)
      console.log(`   ID: ${req.id}`)
      console.log(`   User: ${req.user.email}`)
      console.log(`   Device ID: ${req.deviceId || 'None'}`)
      console.log(`   Archived: ${req.isArchived}`)
      
      if (req.deviceId) {
        // Проверяем, существует ли связанное устройство
        const linkedDevice = await db.device.findUnique({
          where: { id: req.deviceId }
        })
        
        if (linkedDevice) {
          console.log(`   ✅ Linked device exists: ${linkedDevice.name}`)
          
          // Проверяем, видит ли трейдер это устройство
          if (linkedDevice.userId === req.userId) {
            console.log(`   ✅ Device belongs to same user as requisite`)
          } else {
            console.log(`   ❌ Device belongs to different user!`)
            console.log(`      Device User ID: ${linkedDevice.userId}`)
            console.log(`      Requisite User ID: ${req.userId}`)
          }
        } else {
          console.log(`   ❌ Linked device missing! Device ID ${req.deviceId} not found`)
          console.log(`   🔧 Fixing orphaned reference...`)
          
          // Очищаем orphaned reference
          await db.bankDetail.update({
            where: { id: req.id },
            data: { deviceId: null }
          })
          
          console.log(`   ✅ Cleared orphaned device reference`)
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error)
  } finally {
    await db.$disconnect()
  }
}

findDeviceForRequisite()