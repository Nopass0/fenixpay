import { db } from '../src/db'
import { randomBytes } from 'crypto'

async function createTraderSession() {
  const trader = await db.user.findUnique({
    where: { email: 'trader@test.com' }
  })
  
  if (!trader) {
    console.error('Trader not found')
    return
  }
  
  const token = randomBytes(32).toString('hex')
  const session = await db.session.create({
    data: {
      token,
      userId: trader.id,
      ip: '127.0.0.1',
      expiredAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  })
  
  console.log('Created session for trader@test.com')
  console.log('Token:', token)
  console.log('\nUse this for API calls:')
  console.log(`curl -H "x-trader-token: ${token}" http://localhost:3000/api/trader/...`)
}

createTraderSession()