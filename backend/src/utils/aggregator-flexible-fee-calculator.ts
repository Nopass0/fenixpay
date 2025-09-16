import { db } from "@/db";

export interface AggregatorFlexibleFeeResult {
  feeInPercent: number;
  feeOutPercent: number;
  appliedRange?: {
    id: string;
    minAmount: number;
    maxAmount: number;
  };
  usedDefault: boolean;
}

/**
 * Рассчитывает процентные ставки для агрегатора на основе суммы сделки
 * Использует либо гибкие ставки по промежуткам, либо дефолтные значения
 *
 * @param aggregatorId - ID агрегатора
 * @param merchantId - ID мерчанта
 * @param methodId - ID метода
 * @param amount - сумма сделки в рублях
 * @returns объект с рассчитанными ставками
 */
export async function calculateAggregatorFlexibleFees(
  aggregatorId: string,
  merchantId: string,
  methodId: string,
  amount: number
): Promise<AggregatorFlexibleFeeResult> {
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
    // Если связь не найдена, возвращаем нулевые ставки
    return {
      feeInPercent: 0,
      feeOutPercent: 0,
      usedDefault: true,
    };
  }

  // Если гибкие ставки отключены, используем дефолтные значения
  if (
    !aggregatorMerchant.useFlexibleRates ||
    aggregatorMerchant.feeRanges.length === 0
  ) {
    return {
      feeInPercent: aggregatorMerchant.feeIn,
      feeOutPercent: aggregatorMerchant.feeOut,
      usedDefault: true,
    };
  }

  // Ищем подходящий промежуток для данной суммы
  const matchingRange = aggregatorMerchant.feeRanges.find(
    (range) => amount >= range.minAmount && amount <= range.maxAmount
  );

  if (matchingRange) {
    // Найден подходящий промежуток
    return {
      feeInPercent: matchingRange.feeInPercent,
      feeOutPercent: matchingRange.feeOutPercent,
      appliedRange: {
        id: matchingRange.id,
        minAmount: matchingRange.minAmount,
        maxAmount: matchingRange.maxAmount,
      },
      usedDefault: false,
    };
  }

  // Промежуток не найден, используем дефолтные ставки
  return {
    feeInPercent: aggregatorMerchant.feeIn,
    feeOutPercent: aggregatorMerchant.feeOut,
    usedDefault: true,
  };
}

/**
 * Получает процентную ставку для конкретного типа операции (вход/выход) агрегатора
 *
 * @param aggregatorId - ID агрегатора
 * @param merchantId - ID мерчанта
 * @param methodId - ID метода
 * @param amount - сумма сделки в рублях
 * @param operationType - тип операции ('IN' или 'OUT')
 * @returns процентная ставка
 */
export async function getAggregatorFlexibleFee(
  aggregatorId: string,
  merchantId: string,
  methodId: string,
  amount: number,
  operationType: 'IN' | 'OUT'
): Promise<number> {
  const result = await calculateAggregatorFlexibleFees(
    aggregatorId,
    merchantId,
    methodId,
    amount
  );

  return operationType === 'IN' ? result.feeInPercent : result.feeOutPercent;
}

