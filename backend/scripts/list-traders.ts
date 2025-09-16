import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function listTraders() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        devices: {
          select: {
            id: true,
            name: true,
            emulated: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (users.length === 0) {
      console.log('No users/traders found in the database')
    } else {
      console.log(`Found ${users.length} user(s):\n`)
      users.forEach((user, index) => {
        console.log(`User ${index + 1}:`)
        console.log(`  ID: ${user.id}`)
        console.log(`  Name: ${user.name}`)
        console.log(`  Email: ${user.email}`)
        console.log(`  Created: ${user.createdAt}`)
        console.log(`  Devices: ${user.devices.length}`)
        if (user.devices.length > 0) {
          user.devices.forEach(device => {
            console.log(`    - ${device.name} (emulated: ${device.emulated})`)
          })
        }
        console.log('')
      })
    }
  } catch (error) {
    console.error('Error querying database:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listTraders()