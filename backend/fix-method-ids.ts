import { db } from './src/db';

async function fixMethodIds() {
  try {
    console.log('Исправляем methodId для агрегатора chsp...');
    
    // Обновляем methodId на те, которые используются в запросах
    const updated = await db.aggregator.update({
      where: { id: 'cmfl22m3l1i1iik0fhmfgw7nz' },
      data: {
        sbpMethodId: 'cmf73i4sq020lpr01dyy4zxza', // SBP methodId из запроса
        c2cMethodId: 'cmf73hiov01vwpr01fdnugtny'  // C2C methodId из запроса
      }
    });
    
    console.log('✅ MethodId обновлены:');
    console.log('SBP Method ID:', updated.sbpMethodId);
    console.log('C2C Method ID:', updated.c2cMethodId);
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await db.$disconnect();
  }
}

fixMethodIds();
