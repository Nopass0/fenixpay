import { db } from "@/db";
import { Aggregator, Status, Transaction, IntegrationDirection } from "@prisma/client";
import axios, { AxiosError } from "axios";
import { randomBytes } from "crypto";
import { 
  freezeAggregatorBalance,
  unfreezeAggregatorBalance
} from "@/utils/transaction-freezing";

export interface AggregatorDealRequest {
  ourDealId: string;
  status: string;
  amount: number;
  merchantRate: number;
  paymentMethod: "SBP" | "C2C";  // Метод платежа
  bankType?: string;              // Тип банка (если применимо)
  partnerDealId?: string;
  callbackUrl: string;
  clientIdentifier?: string;      // Идентификатор клиента для классификации трафика
  metadata?: any;
  merchantId?: string;
  methodId?: string;
}

export interface AggregatorDealResponse {
  accepted: boolean;
  partnerDealId?: string;
  message?: string;
  requisites?: {                  // Реквизиты для оплаты
    bankName?: string;             // Название банка
    cardNumber?: string;           // Номер карты (для C2C)
    phoneNumber?: string;          // Номер телефона (для SBP)
    recipientName?: string;        // Имя получателя
    bankCode?: string;             // Код банка
    additionalInfo?: string;       // Дополнительная информация
  };
  dealDetails?: {                 // Полная информация о сделке
    id: string;                   // ID в системе агрегатора
    amount: number;
    status: string;
    createdAt: string;
    expiresAt: string;
    paymentMethod: string;
    metadata?: any;
  };
}

export interface AggregatorDisputeRequest {
  ourDealId: string;
  message: string;
  attachments: string[];
}

export interface AggregatorCallbackData {
  ourDealId: string;
  status: string;
  amount?: number;
  partnerDealId?: string;
  updatedAt?: string;
  reason?: string;
  metadata?: any;
}

export class AggregatorServiceV2 {
  private static instance: AggregatorServiceV2;

  static getInstance(): AggregatorServiceV2 {
    if (!AggregatorServiceV2.instance) {
      AggregatorServiceV2.instance = new AggregatorServiceV2();
    }
    return AggregatorServiceV2.instance;
  }

  /**
   * Генерация нового токена для агрегатора
   */
  generateToken(): string {
    return randomBytes(32).toString("hex");
  }

  /**
   * Маскирование токенов в заголовках для логирования
   */
  private maskHeaders(headers: any): any {
    const masked = { ...headers };
    const sensitiveKeys = ["authorization", "x-api-token", "x-aggregator-token", "bearer"];
    
    Object.keys(masked).forEach((key) => {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        const value = masked[key];
        if (typeof value === "string" && value.length > 10) {
          masked[key] = value.substring(0, 10) + "..." + value.substring(value.length - 4);
        }
      }
    });
    
    return masked;
  }

  /**
   * Логирование интеграции
   */
  private async logIntegration(params: {
    aggregatorId: string;
    direction: IntegrationDirection;
    eventType: string;
    method: string;
    url: string;
    headers: any;
    requestBody?: any;
    responseBody?: any;
    statusCode?: number;
    responseTimeMs?: number;
    idempotencyKey?: string;
    ourDealId?: string;
    partnerDealId?: string;
    error?: string;
    metadata?: any;
  }) {
    try {
      const slaViolation = params.responseTimeMs ? params.responseTimeMs > 10000 : false;
      
      await db.aggregatorIntegrationLog.create({
        data: {
          aggregatorId: params.aggregatorId,
          direction: params.direction,
          eventType: params.eventType,
          method: params.method,
          url: params.url,
          headers: this.maskHeaders(params.headers),
          requestBody: params.requestBody || null,
          responseBody: params.responseBody || null,
          statusCode: params.statusCode || null,
          responseTimeMs: params.responseTimeMs || null,
          slaViolation,
          idempotencyKey: params.idempotencyKey || null,
          ourDealId: params.ourDealId || null,
          partnerDealId: params.partnerDealId || null,
          error: params.error || null,
          metadata: params.metadata || null,
        },
      });
    } catch (e) {
      console.error("[AggregatorServiceV2] Error logging integration:", e);
    }
  }

  /**
   * Проверка доступности агрегатора
   */
  async checkAggregatorAvailability(aggregator: Aggregator, amount: number): Promise<boolean> {
    // Проверка активности
    if (!aggregator.isActive) {
      return false;
    }

    // Проверка минимального баланса
    if (aggregator.balanceUsdt < aggregator.minBalance) {
      return false;
    }

    // Проверка достаточности баланса для транзакции
    if (aggregator.balanceUsdt < amount / 100) {
      return false;
    }

    // Проверка дневного лимита
    if (aggregator.maxDailyVolume) {
      // Сброс счетчика если прошел день
      const now = new Date();
      const lastReset = new Date(aggregator.lastVolumeReset);
      if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
        await db.aggregator.update({
          where: { id: aggregator.id },
          data: {
            currentDailyVolume: 0,
            lastVolumeReset: now,
          },
        });
        aggregator.currentDailyVolume = 0;
      }

      if (aggregator.currentDailyVolume + amount > aggregator.maxDailyVolume) {
        return false;
      }
    }

    return true;
  }

  /**
   * Получение отсортированного списка доступных агрегаторов
   */
  async getAvailableAggregators(amount: number): Promise<Aggregator[]> {
    const aggregators = await db.aggregator.findMany({
      where: {
        isActive: true,
        apiBaseUrl: { not: null },
      },
      orderBy: {
        priority: "asc", // Сортировка по приоритету
      },
    });

    // Фильтруем доступных
    const available: Aggregator[] = [];
    for (const aggregator of aggregators) {
      if (await this.checkAggregatorAvailability(aggregator, amount)) {
        available.push(aggregator);
      }
    }

    return available;
  }

  /**
   * Создание сделки у агрегатора
   */
  async createDeal(
    aggregator: Aggregator,
    transaction: Transaction & { method: any; merchant: any }
  ): Promise<{ success: boolean; partnerDealId?: string; requisites?: any; error?: string }> {
    if (!aggregator.apiBaseUrl) {
      return { success: false, error: "Aggregator API base URL not configured" };
    }

    const url = `${aggregator.apiBaseUrl}/deals`;
    const idempotencyKey = `${transaction.id}-${Date.now()}`;
    const startTime = Date.now();

    // Определяем метод платежа
    const paymentMethod = transaction.method.type === "sbp" ? "SBP" : "C2C";

    const requestData: AggregatorDealRequest = {
      ourDealId: transaction.id,
      status: "NEW",
      amount: transaction.amount,
      merchantRate: transaction.rate || 100,
      paymentMethod,
      bankType: transaction.method.bankType,
      callbackUrl: `${(process.env.BASE_URL ?? "https://chspay.pro/api")}/aggregators/callback`,
      clientIdentifier: transaction.clientIdentifier,
      metadata: {
        methodType: transaction.method.type,
        bankType: transaction.method.bankType,
        merchantName: transaction.merchant.name,
      },
    };

    try {
      console.log(`[AggregatorServiceV2] Creating deal at ${aggregator.name}:`, {
        url,
        dealId: transaction.id,
        amount: transaction.amount,
      });

      const response = await axios.post<AggregatorDealResponse>(url, requestData, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${aggregator.customApiToken || aggregator.apiToken}`,
          "Idempotency-Key": idempotencyKey,
        },
        timeout: aggregator.maxSlaMs || 10000, // 10 секунд вместо 2
      });

      const responseTimeMs = Date.now() - startTime;

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "deal_create",
        method: "POST",
        url,
        headers: response.config.headers,
        requestBody: requestData,
        responseBody: response.data,
        statusCode: response.status,
        responseTimeMs,
        idempotencyKey,
        ourDealId: transaction.id,
        partnerDealId: response.data.partnerDealId,
      });

      if (response.data.accepted) {
        // Обновляем дневной объем
        if (aggregator.maxDailyVolume) {
          await db.aggregator.update({
            where: { id: aggregator.id },
            data: {
              currentDailyVolume: { increment: transaction.amount },
            },
          });
        }

        // Формируем строку с реквизитами для сохранения (без дополнительных полей в транзакции)
        let assetOrBank: string | undefined;
        if (response.data.requisites) {
          const req = response.data.requisites;
          if (paymentMethod === "SBP" && req.phoneNumber) {
            assetOrBank = `${req.bankName || "Bank"}: ${req.phoneNumber}`;
          } else if (paymentMethod === "C2C" && req.cardNumber) {
            assetOrBank = `${req.bankName || "Bank"}: ${req.cardNumber}`;
          }
        }

        if (assetOrBank) {
          await db.transaction.update({
            where: { id: transaction.id },
            data: { assetOrBank },
          });
        }

        console.log(`[AggregatorServiceV2] Deal created successfully at ${aggregator.name}`);
        return { 
          success: true, 
          partnerDealId: response.data.partnerDealId,
          requisites: response.data.requisites 
        };
      } else {
        console.log(`[AggregatorServiceV2] Deal rejected by ${aggregator.name}:`, response.data.message);
        return { success: false, error: response.data.message || "Deal rejected" };
      }
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data || axiosError.message || "Unknown error";
      const statusCode = axiosError.response?.status;

      console.error(`[AggregatorServiceV2] Error creating deal at ${aggregator.name}:`, errorMessage);

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "deal_create",
        method: "POST",
        url,
        headers: { Authorization: "Bearer [MASKED]", "Idempotency-Key": idempotencyKey },
        requestBody: requestData,
        responseBody: axiosError.response?.data,
        statusCode,
        responseTimeMs,
        idempotencyKey,
        ourDealId: transaction.id,
        error: String(errorMessage),
      });

      return { success: false, error: String(errorMessage) };
    }
  }

  /**
   * Получение информации о сделке
   */
  async getDealInfo(
    aggregator: Aggregator,
    partnerDealId: string
  ): Promise<{ success: boolean; dealInfo?: any; error?: string }> {
    if (!aggregator.apiBaseUrl) {
      return { success: false, error: "Aggregator API base URL not configured" };
    }

    const url = `${aggregator.apiBaseUrl}/deals/${partnerDealId}`;
    const startTime = Date.now();

    try {
      console.log(`[AggregatorServiceV2] Getting deal info from ${aggregator.name}:`, {
        url,
        partnerDealId,
      });

      const response = await axios.get(url, {
        headers: {
          "Authorization": `Bearer ${aggregator.customApiToken || aggregator.apiToken}`,
        },
        timeout: aggregator.maxSlaMs || 10000, // 10 секунд вместо 2
      });

      const responseTimeMs = Date.now() - startTime;

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "deal_info",
        method: "GET",
        url,
        headers: { Authorization: "Bearer [MASKED]" },
        responseBody: response.data,
        statusCode: response.status,
        responseTimeMs,
        partnerDealId,
      });

      return {
        success: true,
        dealInfo: response.data,
      };
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data || axiosError.message || "Unknown error";

      console.error(`[AggregatorServiceV2] Error getting deal info from ${aggregator.name}:`, errorMessage);

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "deal_info",
        method: "GET",
        url,
        headers: { Authorization: "Bearer [MASKED]" },
        responseBody: axiosError.response?.data,
        statusCode: axiosError.response?.status,
        responseTimeMs,
        partnerDealId,
        error: String(errorMessage),
      });

      return { success: false, error: String(errorMessage) };
    }
  }

  /**
   * Создание спора по сделке
   */
  async createDispute(
    aggregator: Aggregator,
    partnerDealId: string,
    ourDealId: string,
    message: string,
    attachments: string[]
  ): Promise<{ success: boolean; error?: string }> {
    if (!aggregator.apiBaseUrl) {
      return { success: false, error: "Aggregator API base URL not configured" };
    }

    const url = `${aggregator.apiBaseUrl}/deals/${partnerDealId}/disputes`;
    const startTime = Date.now();

    const requestData: AggregatorDisputeRequest = {
      ourDealId,
      message,
      attachments,
    };

    try {
      console.log(`[AggregatorServiceV2] Creating dispute at ${aggregator.name}:`, {
        url,
        ourDealId,
        partnerDealId,
      });

      const response = await axios.post(url, requestData, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${aggregator.customApiToken || aggregator.apiToken}`,
        },
        timeout: aggregator.maxSlaMs || 10000, // 10 секунд вместо 2
      });

      const responseTimeMs = Date.now() - startTime;

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "dispute_create",
        method: "POST",
        url,
        headers: response.config.headers,
        requestBody: requestData,
        responseBody: response.data,
        statusCode: response.status,
        responseTimeMs,
        ourDealId,
        partnerDealId,
      });

      if (response.data.accepted) {
        console.log(`[AggregatorServiceV2] Dispute created successfully at ${aggregator.name}`);
        return { success: true };
      } else {
        return { success: false, error: response.data.message || "Dispute rejected" };
      }
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const errorMessage = axiosError.response?.data || axiosError.message || "Unknown error";
      const statusCode = axiosError.response?.status;

      console.error(`[AggregatorServiceV2] Error creating dispute at ${aggregator.name}:`, errorMessage);

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "dispute_create",
        method: "POST",
        url,
        headers: { Authorization: "Bearer [MASKED]" },
        requestBody: requestData,
        responseBody: axiosError.response?.data,
        statusCode,
        responseTimeMs,
        ourDealId,
        partnerDealId,
        error: String(errorMessage),
      });

      return { success: false, error: String(errorMessage) };
    }
  }

  /**
   * Обработка callback от агрегатора
   */
  async processCallback(
    aggregator: Aggregator,
    callbackData: AggregatorCallbackData | AggregatorCallbackData[]
  ): Promise<{ success: boolean; results?: any[]; error?: string }> {
    const callbacks = Array.isArray(callbackData) ? callbackData : [callbackData];
    const results = [];

    for (const callback of callbacks) {
      try {
        // Проверяем транзакцию
        const transaction = await db.transaction.findFirst({
          where: {
            id: callback.ourDealId,
            aggregatorId: aggregator.id,
          },
          include: {
            merchant: true,
            method: true,
          },
        });

        if (!transaction) {
          results.push({
            ourDealId: callback.ourDealId,
            status: "error",
            message: "Transaction not found",
          });
          continue;
        }

        // Обновляем статус если изменился
        if (callback.status && callback.status !== transaction.status) {
          // Маппим статусы агрегатора на наши статусы
          const incoming = (callback.status || "").toString().toUpperCase();
          const statusMap: Record<string, string> = {
            'CREATED': 'IN_PROGRESS',
            'PROGRESS': 'PROCESSING',
            'PROCESSING': 'PROCESSING',
            'SUCCESS': 'READY',
            'COMPLETED': 'READY',
            'READY': 'READY',
            'FAILED': 'CANCELLED',
            'CANCELLED': 'CANCELLED',
            'EXPIRED': 'EXPIRED',
            'TIMEOUT': 'EXPIRED'
          };
          
          const mapped = statusMap[incoming] || incoming;
          const newStatus = mapped as Status;
          
          const updatedTransaction = await db.transaction.update({
            where: { id: transaction.id },
            data: {
              status: newStatus,
              ...(newStatus === Status.READY && { acceptedAt: new Date() }),
              ...(callback.partnerDealId && { externalId: callback.partnerDealId }),
            },
            include: {
              merchant: true,
              method: true,
            },
          });

          // Обработка финансовых операций при завершении
          if (newStatus === Status.READY && transaction.status !== Status.READY) {
            await this.processFinancialOperations(updatedTransaction, aggregator);
          }

          // Отправляем callback мерчанту
          const { sendTransactionCallbacks } = await import("@/utils/notify");
          await sendTransactionCallbacks(updatedTransaction);

          results.push({
            ourDealId: callback.ourDealId,
            status: "accepted",
            message: "Status updated",
          });
        }

        // Обновляем сумму если изменилась
        if (callback.amount && callback.amount !== transaction.amount) {
          await db.transaction.update({
            where: { id: transaction.id },
            data: {
              amount: callback.amount,
            },
          });

          results.push({
            ourDealId: callback.ourDealId,
            status: "accepted",
            message: "Amount updated",
          });
        }
      } catch (error) {
        console.error(`[AggregatorServiceV2] Error processing callback:`, error);
        results.push({
          ourDealId: callback.ourDealId,
          status: "error",
          message: String(error),
        });
      }
    }

    return { success: true, results };
  }

  /**
   * Обработка финансовых операций при завершении транзакции
   */
  private async processFinancialOperations(
    transaction: any,
    aggregator: Aggregator
  ): Promise<void> {
    await db.$transaction(async (prisma) => {
      if (transaction.type === "IN") {
        const rate = transaction.rate || 100;
        const merchantCredit = transaction.amount / rate;

        // Размораживаем баланс агрегатора (если был заморожен)
        if (transaction.aggregatorId && transaction.frozenUsdtAmount) {
          await unfreezeAggregatorBalance(prisma, aggregator.id, transaction.frozenUsdtAmount);
        }

        // Начисляем мерчанту
        await prisma.merchant.update({
          where: { id: transaction.merchantId },
          data: {
            balanceUsdt: { increment: merchantCredit },
          },
        });

        // Списываем с агрегатора (из основного баланса)
        await prisma.aggregator.update({
          where: { id: aggregator.id },
          data: {
            balanceUsdt: { decrement: merchantCredit },
          },
        });
      }
    });
  }

  /**
   * Отправка мок-сделки для тестирования
   */
  async sendMockDeal(
    aggregator: Aggregator,
    mockData: {
      amount: number;
      merchantRate: number;
      metadata?: any;
    }
  ): Promise<{
    success: boolean;
    request: any;
    response: any;
    statusCode: number;
    responseTimeMs: number;
    slaViolation: boolean;
    error?: string;
  }> {
    if (!aggregator.apiBaseUrl) {
      return {
        success: false,
        request: null,
        response: null,
        statusCode: 0,
        responseTimeMs: 0,
        slaViolation: false,
        error: "Aggregator API base URL not configured",
      };
    }

    // Определяем правильный эндпоинт в зависимости от типа агрегатора
    const url = aggregator.isChaseCompatible 
      ? `${aggregator.apiBaseUrl}/merchant/transactions/in`
      : `${aggregator.apiBaseUrl}/deals`;
    const mockDealId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const idempotencyKey = `mock-${mockDealId}`;
    const startTime = Date.now();

    // Формируем правильный запрос в зависимости от типа агрегатора
    let requestData: any;
    if (aggregator.isChaseCompatible) {
      requestData = {
        amount: mockData.amount,
        orderId: mockDealId,
        methodId: mockData.metadata?.methodId || 'method_1a2b3c4d5e6f',
        rate: mockData.merchantRate,
        expired_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        userIp: mockData.metadata?.userIp || '127.0.0.1',
        clientIdentifier: mockData.metadata?.clientIdentifier || 'client_user_12345',
        callbackUri: `${(process.env.BASE_URL as string | undefined) || "https://chasepay.pro"}/api/aggregator/chase-callback/${aggregator.id}`,
        // Убираем isMock - его нет в API
      };
    } else {
      requestData = {
        ourDealId: mockDealId,
        status: "NEW",
        amount: mockData.amount,
        merchantRate: mockData.merchantRate,
        paymentMethod: "C2C",
        callbackUrl: `${(process.env.BASE_URL as string | undefined) || "https://api.chase.com"}/api/aggregators/callback`,
        metadata: mockData.metadata || { test: true },
      };
    }

    // Подготавливаем заголовки
    const requestHeaders = {
      "Content-Type": "application/json",
      ...(aggregator.isChaseCompatible ? {
        'x-merchant-api-key': aggregator.customApiToken || aggregator.apiToken
      } : {
        "Authorization": `Bearer ${aggregator.customApiToken || aggregator.apiToken}`,
        "x-aggregator-token": aggregator.customApiToken || aggregator.apiToken,
        "x-api-token": aggregator.customApiToken || aggregator.apiToken,
        "Idempotency-Key": idempotencyKey
      }),
    };

    console.log(`[AggregatorV2] Headers for ${aggregator.isChaseCompatible ? 'Chase-compatible' : 'standard'} aggregator:`, requestHeaders);

    try {
      const response = await axios.post<AggregatorDealResponse>(url, requestData, {
        headers: requestHeaders,
        timeout: aggregator.maxSlaMs || 10000, // 10 секунд вместо 2
        // Игнорируем SSL ошибки для тестирования
        httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
      });

      const responseTimeMs = Date.now() - startTime;
      const slaViolation = responseTimeMs > (aggregator.maxSlaMs || 10000);

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "mock_test",
        method: "POST",
        url,
        headers: requestHeaders,
        requestBody: requestData,
        responseBody: response.data,
        statusCode: response.status,
        responseTimeMs,
        idempotencyKey,
        ourDealId: mockDealId,
        partnerDealId: response.data.partnerDealId,
        metadata: { isMockTest: true },
      });

      return {
        success: response.data.accepted || (aggregator.isChaseCompatible && response.data.id),
        request: {
          url,
          method: 'POST',
          headers: requestHeaders,
          data: requestData
        },
        response: response.data,
        statusCode: response.status,
        responseTimeMs,
        slaViolation,
      };
    } catch (error: any) {
      const responseTimeMs = Date.now() - startTime;
      const axiosError = error as AxiosError;
      const slaViolation = responseTimeMs > (aggregator.maxSlaMs || 10000);

      console.log(`[AggregatorV2] Error details:`, {
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        data: axiosError.response?.data,
        code: axiosError.code
      });

      await this.logIntegration({
        aggregatorId: aggregator.id,
        direction: IntegrationDirection.OUT,
        eventType: "mock_test",
        method: "POST",
        url,
        headers: requestHeaders,
        requestBody: requestData,
        responseBody: axiosError.response?.data,
        statusCode: axiosError.response?.status,
        responseTimeMs,
        idempotencyKey,
        ourDealId: mockDealId,
        error: axiosError.message,
        metadata: { isMockTest: true },
      });

      // Извлекаем реальный код ошибки из тела ответа, если он есть
      const responseData = axiosError.response?.data;
      const actualStatusCode = responseData?.code || axiosError.response?.status || 0;
      const actualError = responseData?.error || axiosError.message;

      return {
        success: false,
        request: {
          url,
          method: 'POST',
          headers: requestHeaders,
          data: requestData
        },
        response: responseData || { error: axiosError.message },
        statusCode: actualStatusCode,
        responseTimeMs,
        slaViolation,
        error: actualError,
      };
    }
  }
}

export const aggregatorServiceV2 = AggregatorServiceV2.getInstance();
