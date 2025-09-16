import { db } from './src/db';

async function checkMethodIds() {
  try {
    const aggregator = await db.aggregator.findUnique({
      where: { id: 'cmfl22m3l1i1iik0fhmfgw7nz' },
      select: {
        name: true,
        sbpMethodId: true,
        c2cMethodId: true
      }
    });
    
    if (aggregator) {
      console.log('Method IDs для агрегатора chsp:');
      console.log('SBP Method ID:', aggregator.sbpMethodId);
      console.log('C2C Method ID:', aggregator.c2cMethodId);
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

checkMethodIds();
