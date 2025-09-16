import { db } from "@/db";
import { getAggregatorRateSafe } from "./aggregator-rate";

export interface AggregatorRateResult {
  rate: number;
  source: 'flexible' | 'base';
  appliedRange?: {
    id: string;
    minAmount: number;
    maxAmount: number;
    rate: number;
  };
  usedDefault: boolean;
}

/**
 * Получает курс для агрегатора с учетом гибких ставок или базовой ставки
 * в зависимости от суммы сделки
 *
 * @param aggregatorId - ID агрегатора
 * @param merchantId - ID мерчанта
 * @param methodId - ID метода
 * @param amount - сумма сделки в рублях
 * @returns объект с информацией о курсе
 */
export async function getAggregatorRateForAmount(
  aggregatorId: string,
  merchantId: string,
  methodId: string,
  amount: number
): Promise<AggregatorRateResult> {
  // Получаем настройки агрегатора для данного мерчанта и метода
  const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
    where: {
      aggregatorId_merchantId_methodId: {
        aggregatorId,
        merchantId,
        methodId,
      },
    },
    include: {
      feeRanges: {
        where: { isActive: true },
        orderBy: { minAmount: "asc" },
      },
    },
  });

  if (!aggregatorMerchant) {
    // Если связь не найдена, используем базовый курс агрегатора
    const baseRate = await getAggregatorRateSafe(aggregatorId, 100);
    return {
      rate: baseRate,
      source: 'base',
      usedDefault: true,
    };
  }

  // Если гибкие ставки отключены, используем базовый курс агрегатора
  if (
    !aggregatorMerchant.useFlexibleRates ||
    aggregatorMerchant.feeRanges.length === 0
  ) {
    const baseRate = await getAggregatorRateSafe(aggregatorId, 100);
    return {
      rate: baseRate,
      source: 'base',
      usedDefault: true,
    };
  }

  // Ищем подходящий промежуток для данной суммы
  const matchingRange = aggregatorMerchant.feeRanges.find(
    (range) => amount >= range.minAmount && amount <= range.maxAmount
  );

  if (matchingRange) {
    // Найден подходящий промежуток - используем базовый курс агрегатора
    // (гибкие ставки влияют только на комиссии, а не на курс)
    const baseRate = await getAggregatorRateSafe(aggregatorId, 100);
    return {
      rate: baseRate,
      source: 'base',
      appliedRange: {
        id: matchingRange.id,
        minAmount: matchingRange.minAmount,
        maxAmount: matchingRange.maxAmount,
        rate: baseRate,
      },
      usedDefault: false,
    };
  }

  // Промежуток не найден, используем базовый курс агрегатора
  const baseRate = await getAggregatorRateSafe(aggregatorId, 100);
  return {
    rate: baseRate,
    source: 'base',
    usedDefault: true,
  };
}

/**
 * Получает курс агрегатора для суммы сделки (упрощенная версия)
 *
 * @param aggregatorId - ID агрегатора
 * @param merchantId - ID мерчанта
 * @param methodId - ID метода
 * @param amount - сумма сделки в рублях
 * @param fallbackRate - курс по умолчанию
 * @returns курс агрегатора
 */
export async function getAggregatorRateForAmountSafe(
  aggregatorId: string,
  merchantId: string,
  methodId: string,
  amount: number,
  fallbackRate: number = 100
): Promise<number> {
  try {
    const result = await getAggregatorRateForAmount(
      aggregatorId,
      merchantId,
      methodId,
      amount
    );
    return result.rate;
  } catch (error) {
    console.error(`[AggregatorRateCalculator] Failed to get rate for amount:`, error);
    return fallbackRate;
  }
}
