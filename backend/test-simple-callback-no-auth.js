const axios = require('axios');

async function testSimpleCallbackNoAuth() {
  try {
    console.log('🧪 Тестируем простой колбэк без аутентификации...');
    
    // Тестируем с разными заголовками
    const testCases = [
      {
        name: 'Без заголовков',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: 'С Authorization заголовком',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      },
      {
        name: 'С x-aggregator-token заголовком',
        headers: { 
          'Content-Type': 'application/json',
          'x-aggregator-token': 'test-token'
        }
      }
    ];
    
    for (const testCase of testCases) {
      try {
        console.log(`\n📤 Тестируем: ${testCase.name}`);
        
        const response = await axios.post('http://localhost:3000/api/aggregator/callback', {
          id: "test-123",
          amount: 1000,
          status: "READY"
        }, {
          headers: testCase.headers,
          timeout: 5000
        });
        
        console.log(`✅ Успех:`, response.status, response.data);
      } catch (error) {
        console.log(`❌ Ошибка:`, error.response?.status, error.response?.data || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

testSimpleCallbackNoAuth();

