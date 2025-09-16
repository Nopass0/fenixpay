import { db } from '../src/db'

async function seedDisputeSettings() {
  try {
    console.log('🌱 Starting dispute settings seed...\n')

    // Dispute timeout settings
    const disputeSettings = [
      { key: 'disputeDayShiftStartHour', value: '9', description: 'Start hour for day shift (9 AM)' },
      { key: 'disputeDayShiftEndHour', value: '21', description: 'End hour for day shift (9 PM)' },
      { key: 'disputeDayShiftTimeoutMinutes', value: '30', description: 'Timeout for disputes during day shift (30 minutes)' },
      { key: 'disputeNightShiftTimeoutMinutes', value: '60', description: 'Timeout for disputes during night shift (60 minutes)' }
    ]

    for (const setting of disputeSettings) {
      await db.systemConfig.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value }
      })
      console.log(`✓ Created/Updated ${setting.key}: ${setting.value} (${setting.description})`)
    }

    console.log('\n✅ Dispute settings seed completed successfully!')
  } catch (error) {
    console.error('❌ Error seeding dispute settings:', error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// Run the seed
seedDisputeSettings()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })