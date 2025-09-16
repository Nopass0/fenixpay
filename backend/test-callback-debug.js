const axios = require('axios');

async function testCallbackDebug() {
  try {
    console.log('🧪 Тестируем отладку колбэка...');
    
    // Тестируем разные эндпоинты
    const endpoints = [
      '/api/aggregator/callback',
      '/api/aggregators/callback',
      '/api/aggregator/chase-callback/test'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📤 Тестируем ${endpoint}...`);
        
        const response = await axios.post(`http://localhost:3000${endpoint}`, {
          id: "test-123",
          amount: 1000,
          status: "READY"
        }, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        console.log(`✅ ${endpoint} - Успех:`, response.status, response.data);
      } catch (error) {
        console.log(`❌ ${endpoint} - Ошибка:`, error.response?.status, error.response?.data || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

testCallbackDebug();

