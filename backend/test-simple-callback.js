const axios = require('axios');

async function testSimpleCallback() {
  try {
    console.log('🧪 Тестируем простой колбэк...');
    
    const callbackData = {
      id: "ADMIN_IN_1757930774922_po2nq4",
      amount: 6231,
      status: "READY"
    };
    
    console.log('📤 Отправляем колбэк:', callbackData);
    
    const response = await axios.post('http://localhost:3000/api/aggregator/callback', callbackData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Ответ сервера:', response.data);
    console.log('📊 Статус код:', response.status);
    
  } catch (error) {
    console.error('❌ Ошибка:', error.response?.data || error.message);
    console.error('📊 Статус код:', error.response?.status);
  }
}

testSimpleCallback();

