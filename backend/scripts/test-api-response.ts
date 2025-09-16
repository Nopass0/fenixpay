import axios from 'axios'

async function testApiResponse() {
  console.log('=== TESTING API RESPONSE FOR TRANSACTION #355 ===\n')

  try {
    // Сначала логинимся
    const loginResponse = await axios.post('http://localhost:3000/api/user/auth', {
      email: 'trader@example.com',
      password: 'password123'
    })
    
    const token = loginResponse.data.token
    console.log('Login successful, got token')

    // Получаем транзакции
    const transactionsResponse = await axios.get('http://localhost:3000/api/trader/transactions', {
      headers: {
        'x-trader-token': token
      }
    })

    // Ищем транзакцию #355
    const tx355 = transactionsResponse.data.data.find((tx: any) => tx.numericId === 355)
    
    if (tx355) {
      console.log('\nTransaction #355 from API:')
      console.log(`  frozenUsdtAmount: ${tx355.frozenUsdtAmount}`)
      console.log(`  calculatedCommission: ${tx355.calculatedCommission}`)
      console.log(`  rate: ${tx355.rate}`)
      console.log(`  profit: ${tx355.profit}`)
      console.log(`  amount: ${tx355.amount}`)
      
      console.log('\nChecking what frontend would display:')
      if (tx355.frozenUsdtAmount) {
        console.log(`  Using frozenUsdtAmount: ${tx355.frozenUsdtAmount.toFixed(2)} USDT`)
      } else {
        console.log(`  frozenUsdtAmount is null/undefined, using fallback calculation:`)
        const fallback = tx355.rate ? (tx355.amount / tx355.rate).toFixed(2) : (tx355.amount / 95).toFixed(2)
        console.log(`  Fallback: ${fallback} USDT`)
      }
    } else {
      console.log('Transaction #355 not found in API response')
    }
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message)
  }
}

testApiResponse().catch(console.error)