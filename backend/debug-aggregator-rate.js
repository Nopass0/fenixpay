const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugAggregatorRate() {
  try {
    const aggregatorId = 'cmff4z3sm00voiklx1qj9nzma';
    
    console.log('Проверяем агрегатор:', aggregatorId);
    
    // Проверяем источник курса агрегатора
    const rateSource = await prisma.aggregatorRateSource.findUnique({
      where: { aggregatorId },
      include: { rateSource: true }
    });
    
    console.log('Источник курса агрегатора:', rateSource);
    
    // Проверяем глобальные источники курса
    const globalSources = await prisma.rateSourceConfig.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log('\nГлобальные источники курса:');
    globalSources.forEach(source => {
      console.log(`- ${source.displayName}: ${source.source}, kkkPercent: ${source.kkkPercent}, baseRate: ${source.baseRate}`);
    });
    
    // Проверяем, есть ли активный источник по умолчанию
    const defaultSource = await prisma.rateSourceConfig.findFirst({
      where: { source: 'rapira' }
    });
    
    console.log('\nИсточник по умолчанию:', defaultSource);
    
    // Проверяем последние курсы из Rapira
    const rapiraRate = await prisma.rateLog.findFirst({
      where: { source: 'rapira' },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nПоследний курс Rapira:', rapiraRate);
    
    // Проверяем последние курсы из Bybit
    const bybitRate = await prisma.rateLog.findFirst({
      where: { source: 'bybit' },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('\nПоследний курс Bybit:', bybitRate);
    
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugAggregatorRate();
