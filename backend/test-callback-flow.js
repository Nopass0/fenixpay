const axios = require('axios');

async function testCallbackFlow() {
  console.log('=== Testing Complete Callback Flow ===\n');
  
  // Step 1: Get a transaction to test with
  const transactionId = 'ADMIN_IN_1757930774922_po2nq4';
  console.log(`Testing with transaction orderId: ${transactionId}\n`);
  
  // Step 2: Send callback to our endpoint
  const callbackData = {
    id: transactionId,
    amount: 6231,
    status: "READY"
  };
  
  console.log('Sending callback to aggregator endpoint:', callbackData);
  
  try {
    const response = await axios.post('http://localhost:3000/api/aggregator/callback', callbackData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response from aggregator callback:', response.data);
    console.log('\nCallback processed successfully!');
    
    // Give it a moment for async operations
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\nCheck the console logs above to see if merchant callback was sent.');
    console.log('Look for lines containing "[Callback]" to trace the flow.');
    
  } catch (error) {
    console.error('Error sending callback:', error.response?.data || error.message);
  }
}

testCallbackFlow();