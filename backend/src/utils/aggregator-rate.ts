import { db } from "@/db";
import { rapiraService } from "@/services/rapira.service";
import { bybitService } from "@/services/bybit.service";

/**
 * Получает курс для агрегатора из подключенного источника курса
 * @param aggregatorId - ID агрегатора
 * @returns Объект с информацией о курсе
 */
export async function getAggregatorRate(aggregatorId: string): Promise<{
  baseRate: number;
  kkkPercent: number;
  kkkOperation: 'PLUS' | 'MINUS';
  rate: number;
  source: 'rapira' | 'bybit' | 'custom';
  sourceName: string;
  isCustom: boolean;
}> {
  // Получаем источник курса для агрегатора
  const aggregatorRateSource = await db.aggregatorRateSource.findUnique({
    where: { aggregatorId: aggregatorId },
    include: { rateSource: true }
  });

  if (!aggregatorRateSource?.rateSource) {
    // Если у агрегатора нет привязанного источника, используем Rapira по умолчанию
    const defaultSource = await db.rateSourceConfig.findFirst({
      where: { source: 'rapira', isActive: true }
    });

    if (!defaultSource) {
      throw new Error('Нет доступных источников курса для агрегатора');
    }

    // Получаем базовый курс от Rapira
    let baseRate = null;
    try {
      baseRate = await rapiraService.getUsdtRubRate();
    } catch (error) {
      console.warn('[AggregatorRate] Failed to get Rapira rate, using fallback:', error);
      baseRate = defaultSource.baseRate || 96.0;
    }

    // Применяем процент КК источника
    const adjustedRate = baseRate * (1 + (defaultSource.kkkPercent / 100) * (defaultSource.kkkOperation === 'MINUS' ? -1 : 1));

    return {
      baseRate,
      kkkPercent: defaultSource.kkkPercent,
      kkkOperation: defaultSource.kkkOperation,
      rate: adjustedRate,
      source: defaultSource.source,
      sourceName: defaultSource.displayName,
      isCustom: false
    };
  }

  // Получаем базовый курс от источника
  let baseRate = null;
  try {
    if (aggregatorRateSource.rateSource.source === 'bybit') {
      baseRate = await bybitService.getUsdtRubRate();
      
      // Если Bybit возвращает null или неверный курс, используем fallback
      if (!baseRate || baseRate <= 0) {
        throw new Error('Invalid rate from Bybit service');
      }
    } else if (aggregatorRateSource.rateSource.source === 'rapira') {
      baseRate = await rapiraService.getUsdtRubRate();
    } else {
      // Для других источников используем сохраненный базовый курс
      baseRate = aggregatorRateSource.rateSource.baseRate || 96.0;
    }
  } catch (error) {
    console.warn(`[AggregatorRate] Failed to get rate from ${aggregatorRateSource.rateSource.source}, using fallback:`, error);
    // Fallback к сохраненному базовому курсу
    baseRate = aggregatorRateSource.rateSource.baseRate || 96.0;
  }

  // Применяем ККК агрегатора
  let adjustedRate = baseRate;
  if (aggregatorRateSource.kkkPercent && aggregatorRateSource.kkkPercent > 0) {
    const kkkAmount = baseRate * (aggregatorRateSource.kkkPercent / 100);
    if (aggregatorRateSource.kkkOperation === 'PLUS') {
      adjustedRate += kkkAmount;
    } else {
      adjustedRate -= kkkAmount;
    }
  }

  return {
    baseRate,
    kkkPercent: aggregatorRateSource.kkkPercent,
    kkkOperation: aggregatorRateSource.kkkOperation,
    rate: adjustedRate,
    source: aggregatorRateSource.rateSource.source,
    sourceName: aggregatorRateSource.rateSource.displayName,
    isCustom: false
  };
}

/**
 * Получает курс для агрегатора с обработкой ошибок
 * @param aggregatorId - ID агрегатора
 * @param fallbackRate - Курс по умолчанию, если не удалось получить
 * @returns Курс агрегатора
 */
export async function getAggregatorRateSafe(aggregatorId: string, fallbackRate: number = 96.0): Promise<number> {
  try {
    const rateData = await getAggregatorRate(aggregatorId);
    return rateData.rate;
  } catch (error) {
    console.error(`[AggregatorRate] Failed to get rate for aggregator ${aggregatorId}:`, error);
    return fallbackRate;
  }
}

