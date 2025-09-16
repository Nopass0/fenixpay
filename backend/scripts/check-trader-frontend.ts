import axios from 'axios'

const API_URL = 'http://localhost:3000/api'

async function testFrontendAPI() {
  try {
    // 1. Login to get token
    console.log('1. Logging in...')
    const loginResponse = await axios.post(`${API_URL}/user/auth`, {
      email: 'trader@test.com',
      password: 'd2483abb1fd002ae'
    })
    const token = loginResponse.data.token
    console.log('✓ Got token:', token.substring(0, 10) + '...')

    // 2. Test profile endpoint
    console.log('\n2. Testing profile endpoint...')
    const profileResponse = await axios.get(`${API_URL}/trader/profile`, {
      headers: { 'x-trader-token': token }
    })
    console.log('✓ Profile response:', JSON.stringify(profileResponse.data, null, 2))

    // 3. Test transactions endpoint  
    console.log('\n3. Testing transactions endpoint...')
    const txResponse = await axios.get(`${API_URL}/trader/transactions`, {
      headers: { 'x-trader-token': token }
    })
    console.log('✓ Transactions response structure:')
    console.log('  - data:', Array.isArray(txResponse.data.data) ? `Array of ${txResponse.data.data.length} items` : 'Not an array')
    console.log('  - pagination:', txResponse.data.pagination)
    
    if (txResponse.data.data && txResponse.data.data.length > 0) {
      console.log('\n  First transaction:', JSON.stringify(txResponse.data.data[0], null, 2))
    }

    // 4. Check what the frontend expects
    console.log('\n4. Frontend expectation check:')
    console.log('  - Frontend expects either response.data or response.transactions')
    console.log('  - API returns:', Object.keys(txResponse.data))
    console.log('  - Should work because API returns "data" key')

  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message)
  }
}

testFrontendAPI()