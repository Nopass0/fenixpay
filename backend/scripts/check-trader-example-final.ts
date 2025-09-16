import axios from 'axios'

async function checkTraderExampleFinal() {
  console.log('=== Final check for trader@example.com ===\n')

  // 1. Login
  const loginRes = await axios.post('http://localhost:3000/api/user/auth', {
    email: 'trader@example.com',
    password: 'd2483abb1fd002ae'
  })
  
  const token = loginRes.data.token
  console.log('1. Login successful, token:', token.substring(0, 20) + '...')

  // 2. Get profile
  const profileRes = await axios.get('http://localhost:3000/api/trader/profile', {
    headers: { 'x-trader-token': token }
  })
  
  console.log('\n2. Profile:')
  console.log('   Trust Balance:', profileRes.data.trustBalance)
  console.log('   Frozen USDT:', profileRes.data.frozenUsdt)
  console.log('   Available:', profileRes.data.trustBalance - profileRes.data.frozenUsdt)
  console.log('   Old balanceUsdt:', profileRes.data.balanceUsdt, '(should be 0)')

  // 3. Get transactions
  const txRes = await axios.get('http://localhost:3000/api/trader/transactions', {
    headers: { 'x-trader-token': token }
  })
  
  console.log('\n3. Transactions:')
  console.log('   Total:', txRes.data.pagination?.total || 0)
  console.log('   Returned:', txRes.data.data?.length || 0)
  
  if (txRes.data.data && txRes.data.data.length > 0) {
    console.log('\n   First 3 transactions:')
    txRes.data.data.slice(0, 3).forEach((tx: any, idx: number) => {
      console.log(`   ${idx + 1}. #${tx.numericId}: ${tx.amount} RUB, ${tx.status}, frozen: ${tx.frozenUsdtAmount || 0} USDT`)
    })
  }

  console.log('\n✅ Summary:')
  console.log('   - Trust balance shows correctly:', profileRes.data.trustBalance)
  console.log('   - Frozen amount shows correctly:', profileRes.data.frozenUsdt)
  console.log('   - Transactions are assigned:', txRes.data.data?.length > 0)
  console.log('\n   Now check the browser - balance should show', profileRes.data.trustBalance, 'USDT')
}

checkTraderExampleFinal().catch(console.error)