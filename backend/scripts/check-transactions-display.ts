import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

async function checkTransactionsDisplay() {
  // 1. Login
  const loginRes = await axios.post(`${API_URL}/user/auth`, {
    email: 'trader@test.com',
    password: 'd2483abb1fd002ae'
  })
  const token = loginRes.data.token
  console.log('✓ Logged in')

  // 2. Get transactions like frontend does
  const txRes = await axios.get(`${API_URL}/trader/transactions`, {
    headers: { 'x-trader-token': token }
  })

  console.log('\n=== API Response Structure ===')
  console.log('Keys:', Object.keys(txRes.data))
  console.log('Has data array:', Array.isArray(txRes.data.data))
  console.log('Data length:', txRes.data.data?.length || 0)
  console.log('Pagination:', txRes.data.pagination)

  // 3. Check what frontend expects
  console.log('\n=== Frontend Code Analysis ===')
  console.log('Frontend expects: response.data OR response.transactions')
  console.log('API returns: response.data (which contains data array)')
  console.log('This should work!')

  // 4. Check first transaction structure
  if (txRes.data.data && txRes.data.data.length > 0) {
    const firstTx = txRes.data.data[0]
    console.log('\n=== First Transaction ===')
    console.log('ID:', firstTx.id)
    console.log('Numeric ID:', firstTx.numericId)
    console.log('Amount:', firstTx.amount)
    console.log('Status:', firstTx.status)
    console.log('Client Name:', firstTx.clientName)
    console.log('Asset/Bank:', firstTx.assetOrBank)
    console.log('Merchant:', firstTx.merchant)
    console.log('Method:', firstTx.method)
    console.log('Requisites:', firstTx.requisites)
    
    // Check if all required fields exist
    console.log('\n=== Required Fields Check ===')
    console.log('Has numericId:', 'numericId' in firstTx)
    console.log('Has amount:', 'amount' in firstTx)
    console.log('Has status:', 'status' in firstTx)
    console.log('Has clientName:', 'clientName' in firstTx)
    console.log('Has assetOrBank:', 'assetOrBank' in firstTx)
    console.log('Has createdAt:', 'createdAt' in firstTx)
    console.log('Has expired_at:', 'expired_at' in firstTx)
  }
}

checkTransactionsDisplay().catch(console.error)