import { db } from './src/db';

async function updateApiKey() {
  try {
    console.log('Текущий API ключ:');
    const current = await db.aggregator.findUnique({
      where: { id: 'cmfl22m3l1i1iik0fhmfgw7nz' },
      select: {
        name: true,
        customApiToken: true,
        apiToken: true
      }
    });
    
    if (current) {
      console.log('Custom API Token:', current.customApiToken);
      console.log('API Token:', current.apiToken);
    }
    
    // Запрашиваем новый ключ у пользователя
    console.log('\nВведите новый API ключ для агрегатора chsp:');
    console.log('(или нажмите Enter, чтобы оставить текущий)');
    
    // В реальном приложении здесь был бы prompt, но для скрипта используем пример
    const newApiKey = 'ea8b99acf105a149df8860b93f4c8c46cb2cab04bcb3d1c5166659e9617b8ce6'; // Из вашего примера
    
    if (newApiKey && newApiKey !== current?.customApiToken) {
      const updated = await db.aggregator.update({
        where: { id: 'cmfl22m3l1i1iik0fhmfgw7nz' },
        data: { customApiToken: newApiKey }
      });
      
      console.log('\n✅ API ключ обновлен:');
      console.log('Новый Custom API Token:', updated.customApiToken);
    } else {
      console.log('\nAPI ключ не изменился');
    }
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

updateApiKey();
