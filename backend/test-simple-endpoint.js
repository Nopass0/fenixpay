const axios = require('axios');

async function testSimpleEndpoint() {
  try {
    console.log('🧪 Тестируем простой эндпоинт...');
    
    // Тестируем разные эндпоинты
    const endpoints = [
      '/api/health',
      '/api/aggregator/callback'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📤 Тестируем ${endpoint}...`);
        
        if (endpoint === '/api/health') {
          const response = await axios.get(`http://localhost:3000${endpoint}`);
          console.log(`✅ ${endpoint} - Успех:`, response.status, response.data);
        } else {
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
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - Ошибка:`, error.response?.status, error.response?.data || error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Общая ошибка:', error.message);
  }
}

testSimpleEndpoint();

