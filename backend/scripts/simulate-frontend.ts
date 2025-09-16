import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

async function simulateFrontend() {
  // 1. Login like frontend does
  console.log('1. Simulating frontend login...')
  const loginResponse = await axios.post(`${API_URL}/user/auth`, {
    email: 'trader@test.com',
    password: 'd2483abb1fd002ae'
  })
  const token = loginResponse.data.token
  console.log('✓ Got token')

  // 2. Get profile like frontend does
  console.log('\n2. Getting profile...')
  const profileResponse = await axios.get(`${API_URL}/trader/profile`, {
    headers: { 'x-trader-token': token }
  })
  console.log('Profile data:')
  console.log('- trustBalance:', profileResponse.data.trustBalance)
  console.log('- frozenUsdt:', profileResponse.data.frozenUsdt)
  console.log('- Available:', profileResponse.data.trustBalance - profileResponse.data.frozenUsdt)

  // 3. Get transactions exactly like frontend
  console.log('\n3. Getting transactions...')
  const txResponse = await axios.get(`${API_URL}/trader/transactions`, {
    headers: { 'x-trader-token': token }
  })
  
  // Simulate frontend processing
  const response = txResponse.data
  const txData = response.data || response.transactions || []
  
  console.log('Response structure:')
  console.log('- Has response.data:', !!response.data)
  console.log('- Has response.transactions:', !!response.transactions)
  console.log('- txData is array:', Array.isArray(txData))
  console.log('- txData length:', txData.length)
  
  if (txData.length > 0) {
    console.log('\nFirst 3 transactions:')
    txData.slice(0, 3).forEach((tx: any, idx: number) => {
      console.log(`\n${idx + 1}. Transaction #${tx.numericId}:`)
      console.log('   - Amount:', tx.amount, 'RUB')
      console.log('   - Status:', tx.status)
      console.log('   - Client:', tx.clientName)
      console.log('   - Merchant:', tx.merchant?.name)
      console.log('   - Method:', tx.method?.name)
      console.log('   - Bank:', tx.requisites?.bankType)
      console.log('   - Card:', tx.requisites?.cardNumber)
      console.log('   - assetOrBank:', tx.assetOrBank)
    })
  } else {
    console.log('\nNO TRANSACTIONS FOUND!')
  }

  // 4. Check what might be wrong
  console.log('\n4. Potential issues:')
  console.log('- Loading state stuck?')
  console.log('- Error in console?')
  console.log('- Filter hiding all transactions?')
  console.log('- Component not re-rendering?')
}

simulateFrontend().catch(console.error)