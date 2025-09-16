import { db } from '../src/db'

async function getTraderPassword() {
  const trader = await db.user.findUnique({
    where: { email: 'trader@example.com' }
  })

  if (!trader) {
    console.log('Trader not found')
    return
  }

  console.log('Trader email:', trader.email)
  console.log('Trader name:', trader.name)
  console.log('Password hash:', trader.password)
  
  // Пароль по умолчанию из seed-dev.ts
  console.log('\nDefault password from seed: d2483abb1fd002ae')
  console.log('Try logging in with: trader@example.com / d2483abb1fd002ae')
}

getTraderPassword().catch(console.error).finally(() => process.exit(0))