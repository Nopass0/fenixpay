#!/usr/bin/env bun

import { db } from '../src/db'
import { ServiceRegistry } from '../src/services/ServiceRegistry'

async function createDisputeExpirationService() {
  console.log('🔧 Creating DisputeExpirationService in database...')
  
  try {
    const existingService = await db.service.findUnique({
      where: { name: 'DisputeExpirationService' }
    })
    
    if (existingService) {
      console.log('✅ DisputeExpirationService already exists')
      
      if (!existingService.enabled) {
        await db.service.update({
          where: { name: 'DisputeExpirationService' },
          data: { enabled: true }
        })
        console.log('✅ DisputeExpirationService enabled')
      }
    } else {
      await db.service.create({
        data: {
          name: 'DisputeExpirationService',
          enabled: true,
          lastRunAt: new Date()
        }
      })
      console.log('✅ DisputeExpirationService created and enabled')
    }
    
    console.log('✅ Service configuration complete')
    
  } catch (error) {
    console.error('❌ Error creating DisputeExpirationService:', error)
  } finally {
    await db.$disconnect()
  }
}

createDisputeExpirationService()