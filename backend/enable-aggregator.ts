import { db } from './src/db';

async function enableAggregator() {
  try {
    const result = await db.aggregator.update({
      where: { id: 'cmfl22m3l1i1iik0fhmfgw7nz' },
      data: { isActive: true }
    });
    
    console.log('Агрегатор chsp включен:', result.name, '- Активен:', result.isActive);
    console.log('API Key:', result.customApiToken || result.apiToken);
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

enableAggregator();
