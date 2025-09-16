import axios from 'axios'

async function checkDisplayValues() {
  // Login
  const loginRes = await axios.post('http://localhost:3000/api/user/auth', {
    email: 'trader@example.com',
    password: 'd2483abb1fd002ae'
  })
  const token = loginRes.data.token

  // Get profile
  const profileRes = await axios.get('http://localhost:3000/api/trader/profile', {
    headers: { 'x-trader-token': token }
  })

  console.log('=== SIDEBAR DISPLAY VALUES ===')
  console.log('Trust Balance:', profileRes.data.trustBalance)
  console.log('Frozen USDT:', profileRes.data.frozenUsdt)
  console.log('Available (показывается как Баланс):', profileRes.data.trustBalance - profileRes.data.frozenUsdt)
  console.log('\nВ сайдбаре будет показано:')
  console.log('Баланс:', (profileRes.data.trustBalance - profileRes.data.frozenUsdt).toFixed(2), 'USDT')
  console.log('Заморожено:', profileRes.data.frozenUsdt.toFixed(2), 'USDT (серым цветом)')

  // Get transactions
  const txRes = await axios.get('http://localhost:3000/api/trader/transactions', {
    headers: { 'x-trader-token': token }
  })

  console.log('\n=== TRANSACTIONS DISPLAY VALUES ===')
  if (txRes.data.data && txRes.data.data.length > 0) {
    txRes.data.data.slice(0, 3).forEach((tx: any) => {
      const frozenTotal = (tx.frozenUsdtAmount || 0) + (tx.calculatedCommission || 0)
      console.log(`\nTransaction #${tx.numericId}:`)
      console.log(`  RUB Amount: ${tx.amount}`)
      console.log(`  Frozen USDT: ${tx.frozenUsdtAmount || 0}`)
      console.log(`  Commission: ${tx.calculatedCommission || 0}`)
      console.log(`  Total to display: ${frozenTotal.toFixed(2)} USDT`)
    })
  }
}

checkDisplayValues().catch(console.error)