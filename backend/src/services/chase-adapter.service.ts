import axios, { AxiosError } from "axios";
import axiosInstance from "./axios-config";
import https from "https";
import { db } from "@/db";
import { Status, Aggregator } from "@prisma/client";
import { rapiraService } from "./rapira.service";
import { getAggregatorRateSafe } from "@/utils/aggregator-rate";
import { getAggregatorRateForAmountSafe } from "@/utils/aggregator-rate-calculator";

interface ChaseCreateDealRequest {
  merchantId: string;
  amount: number;
  paymentMethod: string;
  bankType?: string;
  callbackUrl?: string;
  successUrl?: string;
  failureUrl?: string;
  metadata?: any;
  ourDealId?: string;
  expiresAt?: string;
  clientIdentifier?: string;
  methodId?: string;
}

interface ChaseCreateDealResponse {
  success: boolean;
  transactionId?: string;
  paymentUrl?: string;
  error?: string;
  actualMethodId?: string; // Добавляем поле для актуального methodId
  requisites?: {
    id?: string;
    bankType?: string;
    cardNumber?: string;
    phoneNumber?: string;
    recipientName?: string;
    bankName?: string;
    bankCode?: string;
    additionalInfo?: string;
  };
}

interface ChaseCallbackRequest {
  transactionId: string;
  status: Status;
  amount: number;
  fee?: number;
  metadata?: any;
}

interface ChasePayoutRequest {
  merchantId: string;
  amount: number;
  wallet: string;
  bank: string;
  isCard: boolean;
  methodId?: string;
  externalReference?: string;
  webhookUrl?: string;
  metadata?: any;
}

interface ChasePayoutResponse {
  success: boolean;
  payoutId?: string;
  error?: string;
  message?: string;
}

interface ChaseMerchantMethod {
  id: string;
  code?: string;
  name?: string;
  type?: string;
  currency?: string;
  commissionPayin?: number;
  commissionPayout?: number;
  minPayin?: number | null;
  maxPayin?: number | null;
  minPayout?: number | null;
  maxPayout?: number | null;
  isEnabled?: boolean;
}

export class ChaseAdapterService {
  static instance: ChaseAdapterService;
  private httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Отключаем проверку SSL сертификатов
  });

  static getInstance(): ChaseAdapterService {
    if (!ChaseAdapterService.instance) {
      ChaseAdapterService.instance = new ChaseAdapterService();
    }
    return ChaseAdapterService.instance;
  }

  /**
   * Рассчитывает прибыль для сделки с агрегатором
   */
  private async calculateProfit(
    merchantId: string,
    methodId: string,
    aggregatorId: string,
    amountRub: number,
    usdtRubRate: number
  ): Promise<{
    merchantProfit: number;
    aggregatorProfit: number;
    platformProfit: number;
    merchantFeeInPercent: number;
    aggregatorFeeInPercent: number;
  }> {
    // Получаем ставку мерчанта
    const merchantMethod = await db.merchantMethod.findUnique({
      where: { merchantId_methodId: { merchantId, methodId } },
      include: { method: true },
    });

    const merchantFeeInPercent = merchantMethod?.method.commissionPayin || 0;

    // Получаем ставку агрегатора для этого мерчанта
    const aggregatorMerchant = await db.aggregatorMerchant.findUnique({
      where: {
        aggregatorId_merchantId_methodId: {
          aggregatorId,
          merchantId,
          methodId,
        },
      },
    });

    const aggregatorFeeInPercent = aggregatorMerchant?.feeIn || 0;

    // Рассчитываем прибыль в USDT
    const amountUsdt = amountRub / usdtRubRate;

    // Прибыль от мерчанта (ценник мерчанта)
    const merchantProfit = amountUsdt * (merchantFeeInPercent / 100);

    // Прибыль от агрегатора (ценник агрегатора)
    const aggregatorProfit = amountUsdt * (aggregatorFeeInPercent / 100);

    // Общая прибыль платформы
    const platformProfit = merchantProfit - aggregatorProfit;

    return {
      merchantProfit,
      aggregatorProfit,
      platformProfit,
      merchantFeeInPercent,
      aggregatorFeeInPercent,
    };
  }

  private normalizeExternalMethodType(
    methodType?: string | null
  ): "SBP" | "C2C" | null {
    if (!methodType) {
      return null;
    }

    const normalized = methodType.toLowerCase();

    if (normalized.includes("sbp") || normalized === "nspk") {
      return "SBP";
    }

    if (normalized.includes("c2c") || normalized.includes("card")) {
      return "C2C";
    }

    return null;
  }

  private isAmountWithinPayinRange(
    method: ChaseMerchantMethod,
    amount: number
  ): boolean {
    const minPayin =
      typeof method.minPayin === "number" && !Number.isNaN(method.minPayin)
        ? method.minPayin
        : null;
    const maxPayin =
      typeof method.maxPayin === "number" && !Number.isNaN(method.maxPayin)
        ? method.maxPayin
        : null;

    if (minPayin !== null && amount < minPayin) {
      return false;
    }

    if (maxPayin !== null && maxPayin > 0 && amount > maxPayin) {
      return false;
    }

    return true;
  }

  private async fetchAggregatorMethods(
    aggregator: Aggregator
  ): Promise<ChaseMerchantMethod[]> {
    if (!aggregator.apiBaseUrl) {
      console.warn(
        `[ChaseAdapter] Cannot fetch methods: aggregator ${aggregator.id} has no apiBaseUrl`
      );
      return [];
    }

    const endpoint = `${aggregator.apiBaseUrl}/merchant/methods`;

    try {
      const response = await axiosInstance.get<ChaseMerchantMethod[]>(endpoint, {
        headers: {
          "x-merchant-api-key": aggregator.customApiToken || aggregator.apiToken,
        },
        timeout: aggregator.maxSlaMs || 10000,
        httpsAgent: this.httpsAgent,
      });

      if (!Array.isArray(response.data)) {
        console.warn(
          `[ChaseAdapter] Unexpected methods response from aggregator ${aggregator.name}:`,
          response.data
        );
        return [];
      }

      console.log(
        `[ChaseAdapter] Received ${response.data.length} methods from aggregator ${aggregator.name}`
      );

      return response.data;
    } catch (error) {
      console.error(
        `[ChaseAdapter] Failed to fetch methods from aggregator ${aggregator.name}:`,
        error
      );
      return [];
    }
  }

  /**
   * Создает сделку на другом экземпляре Chase, выступающем в роли агрегатора
   */
  async createDeal(
    request: ChaseCreateDealRequest,
    aggregatorId: string
  ): Promise<ChaseCreateDealResponse> {
    let aggregatorMethodId: string | null = null;
    try {
      const aggregator = await db.aggregator.findUnique({
        where: { id: aggregatorId },
      });

      if (!aggregator) {
        throw new Error("Aggregator not found");
      }

      if (!aggregator.isChaseProject && !aggregator.isChaseCompatible) {
        throw new Error(
          "This aggregator is not a Chase project or Chase-compatible"
        );
      }

      if (!aggregator.apiBaseUrl) {
        throw new Error("API base URL not configured for this aggregator");
      }

      console.log(
        `[ChaseAdapter] Creating deal on Chase aggregator ${aggregator.name}:`,
        {
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          isChaseCompatible: aggregator.isChaseCompatible,
          apiBaseUrl: aggregator.apiBaseUrl,
          apiToken: aggregator.apiToken,
          endpoint: aggregator.isChaseCompatible
            ? `${aggregator.apiBaseUrl}/merchant/transactions/in`
            : `${aggregator.apiBaseUrl}/merchant/create-transaction`,
        }
      );

      // Получаем курс из источника агрегатора с учетом гибких ставок
      const rate = await getAggregatorRateForAmountSafe(
        aggregator.id,
        request.merchantId,
        "", // methodId не используется в Chase адаптере
        request.amount,
        100
      );

      console.log(
        `[ChaseAdapter] Using rate ${rate} for aggregator ${aggregator.name}`
      );

      // Формируем запрос в зависимости от типа агрегатора
      let chaseRequest;

      if (aggregator.isChaseCompatible) {
        // Получаем информацию о мерчанте для проверки, является ли он нашей платформой
        const merchant = await db.merchant.findUnique({
          where: { id: request.merchantId || "default" },
          select: { externalSystemName: true },
        });

        // Определяем тип метода из metadata (не ищем в базе данных)
        let methodType: "SBP" | "C2C" | null = null;
        
        // Определяем тип метода из metadata
        if (request.metadata?.methodType) {
          methodType = request.metadata.methodType === "sbp" ? "SBP" : 
                      request.metadata.methodType === "card" || request.metadata.methodType === "c2c" ? "C2C" : null;
        }
        
        console.log(`[ChaseAdapter] Method type from metadata:`, {
          methodType: methodType,
          metadata: request.metadata,
        });

        // Получаем методы агрегатора и подбираем подходящий по типу и диапазону сумм
        const aggregatorMethods = await this.fetchAggregatorMethods(aggregator);

        let selectedMethod: ChaseMerchantMethod | null = null;

        if (methodType) {
          selectedMethod =
            aggregatorMethods.find((method) => {
              if (method.isEnabled === false) {
                return false;
              }

              const normalizedType = this.normalizeExternalMethodType(method.type);

              if (normalizedType !== methodType) {
                return false;
              }

              return this.isAmountWithinPayinRange(method, request.amount);
            }) || null;
        }

        if (selectedMethod) {
          aggregatorMethodId = selectedMethod.id;

          console.log(`[ChaseAdapter] Selected aggregator method`, {
            aggregatorId: aggregator.id,
            aggregatorName: aggregator.name,
            methodId: aggregatorMethodId,
            methodType,
            minPayin: selectedMethod.minPayin,
            maxPayin: selectedMethod.maxPayin,
            amount: request.amount,
          });
        } else {
          console.warn(
            `[ChaseAdapter] No matching aggregator method found via API. Falling back to stored methodId`,
            {
              aggregatorId: aggregator.id,
              methodType,
              amount: request.amount,
            }
          );

          if (methodType === "SBP") {
            aggregatorMethodId = aggregator.sbpMethodId;
          } else if (methodType === "C2C") {
            aggregatorMethodId = aggregator.c2cMethodId;
          }
        }

        if (!aggregatorMethodId) {
          console.warn(
            `[ChaseAdapter] WARNING: Aggregator doesn't have ${methodType} methodId configured!`
          );
          console.warn(
            `[ChaseAdapter] Aggregator configuration:`, {
              aggregatorId: aggregator.id,
              aggregatorName: aggregator.name,
              sbpMethodId: aggregator.sbpMethodId,
              c2cMethodId: aggregator.c2cMethodId,
              methodType: methodType,
            }
          );

          return {
            success: false,
            error: "methodId is not defined",
            actualMethodId: request.methodId || "unknown",
          };
        }

        console.log(`[ChaseAdapter] MethodId resolution:`, {
          requestMethodId: request.methodId,
          metadataMethodId: request.metadata?.methodId,
          methodType: methodType,
          aggregatorSbpMethodId: aggregator.sbpMethodId,
          aggregatorC2cMethodId: aggregator.c2cMethodId,
          aggregatorId: aggregator.id,
          aggregatorName: aggregator.name,
          selectedMethod: selectedMethod
            ? {
                id: selectedMethod.id,
                type: selectedMethod.type,
                minPayin: selectedMethod.minPayin,
                maxPayin: selectedMethod.maxPayin,
              }
            : null,
          finalMethodId: aggregatorMethodId,
        });

        console.log(
          `[ChaseAdapter] Using aggregator's ${methodType} methodId: ${aggregatorMethodId} (original: ${request.methodId})`
        );

        // Для Chase-совместимых агрегаторов используем формат мерчантского API
        chaseRequest = {
          amount: request.amount,
          orderId: request.ourDealId || `deal_${Date.now()}`,
          methodId: aggregatorMethodId,
          rate: rate,
          expired_at:
            request.expiresAt ||
            new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          userIp: request.metadata?.userIp || "127.0.0.1",
          clientIdentifier: request.clientIdentifier || "client_user_12345",
          callbackUri:
            request.callbackUrl ||
            `${
              process.env.BASE_URL || "https://chasepay.pro"
            }/api/aggregator/chase-callback/${aggregatorId}`,
          // isMock убираем, так как в примере его нет
        };

        console.log(`[ChaseAdapter] Formed Chase-compatible request:`, {
          methodType,
          originalMethodId: request.methodId,
          actualMethodId: aggregatorMethodId,
          aggregatorSbpMethodId: aggregator.sbpMethodId,
          aggregatorC2cMethodId: aggregator.c2cMethodId,
          requestData: chaseRequest,
        });
      } else {
        // Для Chase проектов используем старый формат
        chaseRequest = {
          amount: request.amount,
          method: request.paymentMethod,
          bankType: request.bankType,
          callbackUrl:
            request.callbackUrl ||
            `${process.env.BASE_URL}/api/aggregator/chase-callback/${aggregatorId}`,
          successUrl: request.successUrl,
          failureUrl: request.failureUrl,
          metadata: {
            ...request.metadata,
            sourceAggregatorId: aggregatorId,
            sourceMerchantId: request.merchantId,
          },
        };
      }

      // Определяем правильный эндпоинт в зависимости от типа агрегатора
      const endpoint = aggregator.isChaseCompatible
        ? `${aggregator.apiBaseUrl}/merchant/transactions/in` // Chase-like агрегаторы используют /merchant/transactions/in эндпоинт
        : `${aggregator.apiBaseUrl}/merchant/create-transaction`;

      console.log(`[ChaseAdapter] Sending request to ${endpoint}:`, {
        endpoint,
        aggregatorId,
        aggregatorName: aggregator.name,
        isChaseCompatible: aggregator.isChaseCompatible,
        requestData: chaseRequest,
        headers: {
          "Content-Type": "application/json",
          "x-merchant-api-key": "[MASKED]",
        },
      });

      // Отправляем ТОЛЬКО реальный запрос к Chase API - БЕЗ МОКОВ!
      const response = await axiosInstance.post(endpoint, chaseRequest, {
        headers: {
          "Content-Type": "application/json",
          "x-merchant-api-key":
            aggregator.customApiToken || aggregator.apiToken,
        },
        timeout: aggregator.maxSlaMs || 10000, // 10 секунд для Chase агрегаторов
        httpsAgent: this.httpsAgent, // Используем агент с отключенной проверкой SSL
      });

      console.log(`[ChaseAdapter] Chase aggregator response:`, {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        isChaseCompatible: aggregator.isChaseCompatible,
        headers: response.headers,
        requestUrl: response.config?.url,
        requestMethod: response.config?.method,
      });

      // Обрабатываем ответ в зависимости от типа агрегатора
      if (aggregator.isChaseCompatible) {
        // Для Chase-совместимых агрегаторов ответ приходит в формате мерчантского API
        console.log(`[ChaseAdapter] Processing Chase-compatible response:`, {
          hasId: !!response.data.id,
          hasTransactionId: !!response.data.transactionId,
          hasSuccess: !!response.data.success,
          responseKeys: Object.keys(response.data),
        });

        // Проверяем поле success в ответе
        // Проверяем успешность ответа по наличию ID транзакции или реквизитов
        if (response.data.id || response.data.requisites || response.data.success) {
          console.log(
            `[ChaseAdapter] Success response from Chase-compatible aggregator:`,
            {
              hasRequisites: !!response.data.requisites,
              requisites: response.data.requisites,
              transactionId: response.data.id || response.data.transactionId,
              responseData: response.data,
            }
          );

          return {
            success: true,
            transactionId: response.data.id || response.data.transactionId,
            paymentUrl: response.data.paymentUrl,
            requisites: response.data.requisites,
            actualMethodId: aggregatorMethodId || undefined, // Возвращаем актуальный methodId
          };
        } else {
          console.log(
            `[ChaseAdapter] Error response from Chase-compatible aggregator:`,
            {
              responseData: response.data,
              hasError: !!response.data.error,
            }
          );

          // Специальная обработка для NO_REQUISITE - это не критическая ошибка
          if (response.data.error === "NO_REQUISITE") {
            console.log(
              `[ChaseAdapter] NO_REQUISITE error - агрегатор не имеет доступных реквизитов`
            );
            return {
              success: false,
              error: "NO_REQUISITE",
              actualMethodId: aggregatorMethodId || undefined,
            };
          }

          return {
            success: false,
            error:
              response.data.error ||
              "Unknown error from Chase-compatible aggregator",
            actualMethodId: aggregatorMethodId || undefined, // Возвращаем актуальный methodId даже при ошибке
          };
        }
      } else {
        // Для Chase проектов используем старый формат
        if (response.data.success) {
          return {
            success: true,
            transactionId: response.data.transactionId,
            paymentUrl: response.data.paymentUrl,
          };
        } else {
          // Правильно обрабатываем ошибку, включая случай [object Object]
          let errorMessage = response.data.error || "Unknown error from Chase aggregator";
          if (typeof errorMessage === 'object' && errorMessage !== null) {
            if (errorMessage.message) {
              errorMessage = errorMessage.message;
            } else if (errorMessage.code) {
              errorMessage = `Error ${errorMessage.code}`;
            } else {
              errorMessage = JSON.stringify(errorMessage);
            }
          }
          
          return {
            success: false,
            error: errorMessage,
          };
        }
      }
    } catch (error) {
      console.error(`[ChaseAdapter] Error creating deal:`, error);

      // Получаем агрегатора для обработки ошибки, если он еще не был получен
      let aggregatorForError: any = null;
      let actualMethodId: string | undefined = aggregatorMethodId || undefined;

      try {
        aggregatorForError = await db.aggregator.findUnique({
          where: { id: aggregatorId },
        });

        // Пытаемся определить actualMethodId для логирования
        if (!actualMethodId && aggregatorForError && request.methodId) {
          const method = await db.method.findUnique({
            where: { id: request.methodId },
            select: { type: true },
          });

          if (method) {
            const methodType =
              method.type === "sbp"
                ? "SBP"
                : method.type === "card" || method.type === "c2c"
                ? "C2C"
                : null;
            if (methodType === "SBP" && aggregatorForError.sbpMethodId) {
              actualMethodId = aggregatorForError.sbpMethodId;
            } else if (methodType === "C2C" && aggregatorForError.c2cMethodId) {
              actualMethodId = aggregatorForError.c2cMethodId;
            }
          }
        }
      } catch (dbError) {
        console.error(
          `[ChaseAdapter] Error fetching aggregator for error handling:`,
          dbError
        );
      }

      // Логируем ошибку для отладки
      console.error(`[ChaseAdapter] Error occurred:`, {
        isDevelopment: process.env.NODE_ENV === "development",
        isChaseCompatible: aggregatorForError?.isChaseCompatible,
        aggregatorId: aggregatorId,
        actualMethodId: actualMethodId,
        originalMethodId: request.methodId,
        requestData: {
          amount: request.amount,
          paymentMethod: request.paymentMethod,
          methodId: request.methodId,
          metadata: request.metadata,
        },
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<any>;
        
        // Обрабатываем случай, когда сервер возвращает [object Object]
        let errorMessage = axiosError.message;
        if (axiosError.response?.data?.error) {
          const errorData = axiosError.response.data.error;
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof errorData === 'object') {
            // Если это объект, пытаемся извлечь полезную информацию
            if (errorData.message) {
              errorMessage = errorData.message;
            } else if (errorData.code) {
              errorMessage = `Error ${errorData.code}`;
            } else {
              errorMessage = JSON.stringify(errorData);
            }
          }
        }
        
        return {
          success: false,
          error: errorMessage,
          actualMethodId: actualMethodId,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        actualMethodId: actualMethodId,
      };
    }
  }

  /**
   * Обрабатывает callback от Chase-агрегатора
   */
  async handleCallback(
    payload: ChaseCallbackRequest,
    aggregatorId: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`[ChaseAdapter] Received callback from Chase aggregator:`, {
        aggregatorId,
        transactionId: payload.transactionId,
        status: payload.status,
      });

      // Находим нашу транзакцию
      const transaction = await db.transaction.findFirst({
        where: {
          aggregatorId,
          aggregatorOrderId: payload.transactionId,
        },
        include: {
          merchant: true,
          method: true,
        },
      });

      if (!transaction) {
        console.error(
          `[ChaseAdapter] Transaction not found for partner deal ID: ${payload.transactionId}`
        );
        return {
          success: false,
          message: "Transaction not found",
        };
      }

      // Маппим статусы Chase агрегатора на наши статусы
      const statusMap: Record<string, string> = {
        CREATED: "IN_PROGRESS",
        PROGRESS: "PROCESSING",
        PROCESSING: "PROCESSING",
        SUCCESS: "READY",
        COMPLETED: "READY",
        READY: "READY",
        FAILED: "CANCELLED",
        CANCELLED: "CANCELLED",
        EXPIRED: "EXPIRED",
        TIMEOUT: "EXPIRED",
      };

      const incoming = (payload.status || "").toString().toUpperCase();
      const mappedStatus = statusMap[incoming] || incoming;

      // Обновляем статус транзакции
      const updatedTransaction = await db.transaction.update({
        where: { id: transaction.id },
        data: {
          status: mappedStatus as any,
          updatedAt: new Date(),
          ...(mappedStatus === "READY" && { acceptedAt: new Date() }),
        },
        include: {
          merchant: true,
          method: true,
        },
      });

      console.log(`[ChaseAdapter] Transaction status updated:`, {
        transactionId: transaction.id,
        oldStatus: transaction.status,
        incomingStatus: payload.status,
        mappedStatus: mappedStatus,
      });

      // Обрабатываем финансовые операции при успешном завершении
      if (mappedStatus === "READY" && transaction.status !== "READY") {
        await this.processSuccessfulTransaction(
          updatedTransaction,
          aggregatorId,
          payload
        );
      }

      // Отправляем callback мерчанту
      const { sendTransactionCallbacks } = await import("@/utils/notify");
      await sendTransactionCallbacks(updatedTransaction);

      return {
        success: true,
        message: "Callback processed successfully",
      };
    } catch (error) {
      console.error(`[ChaseAdapter] Error processing callback:`, error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Обрабатывает успешную транзакцию
   */
  private async processSuccessfulTransaction(
    transaction: any,
    aggregatorId: string,
    payload: ChaseCallbackRequest
  ): Promise<void> {
    await db.$transaction(async (prisma) => {
      // Получаем агрегатора
      const aggregator = await prisma.aggregator.findUnique({
        where: { id: aggregatorId },
      });

      if (!aggregator) {
        throw new Error("Aggregator not found");
      }

      // Рассчитываем суммы
      const rate = transaction.rate || 100;
      const merchantCredit = transaction.amount / rate;
      const aggregatorFee = payload.fee || 0;
      const finalCredit = merchantCredit - aggregatorFee;

      // Начисляем мерчанту
      if (transaction.type === "IN") {
        await prisma.merchant.update({
          where: { id: transaction.merchantId },
          data: {
            balanceUsdt: { increment: finalCredit },
          },
        });

        // Списываем с баланса агрегатора
        await prisma.aggregator.update({
          where: { id: aggregatorId },
          data: {
            balanceUsdt: { decrement: finalCredit },
          },
        });

        console.log(`[ChaseAdapter] Financial operations completed:`, {
          merchantCredit: finalCredit,
          aggregatorDebit: finalCredit,
        });
      }
    });
  }



  /**
   * Проверяет доступность Chase-агрегатора
   */
  async checkHealth(aggregatorId: string): Promise<boolean> {
    try {
      const aggregator = await db.aggregator.findUnique({
        where: { id: aggregatorId },
      });

      if (!aggregator || !aggregator.isChaseProject || !aggregator.apiBaseUrl) {
        return false;
      }

      const response = await axiosInstance.get(
        `${aggregator.apiBaseUrl}/api/health`,
        {
          timeout: 30000, // 30 секунд
          httpsAgent: this.httpsAgent, // Используем агент с отключенной проверкой SSL
        }
      );

      return response.status === 200;
    } catch (error) {
      console.error(`[ChaseAdapter] Health check failed:`, error);
      return false;
    }
  }

  /**
   * Отправить выплату на Chase-агрегатор
   */
  async sendPayoutToChaseAggregator(
    payout: any,
    aggregatorId: string
  ): Promise<ChasePayoutResponse> {
    try {
      console.log(
        `[ChaseAdapter] Sending payout to Chase aggregator ${aggregatorId}:`,
        {
          payoutId: payout.id,
          amount: payout.amount,
          bank: payout.bank,
          isCard: payout.isCard,
        }
      );

      const aggregator = await db.aggregator.findUnique({
        where: { id: aggregatorId },
      });

      if (!aggregator || !aggregator.isChaseProject || !aggregator.apiBaseUrl) {
        return {
          success: false,
          error: "Chase aggregator not found or not configured",
        };
      }

      // Формируем запрос на выплату
      const payoutRequest: ChasePayoutRequest = {
        merchantId: payout.merchantId,
        amount: payout.amount,
        wallet: payout.wallet,
        bank: payout.bank,
        isCard: payout.isCard,
        methodId: payout.methodId,
        externalReference: payout.externalReference || payout.id,
        webhookUrl: payout.webhookUrl,
        metadata: {
          payoutId: payout.id,
          originalPayoutId: payout.id,
          isChasePayout: true,
        },
      };

      const response = await axiosInstance.post(
        `${aggregator.apiBaseUrl}/merchant/payouts/out`,
        payoutRequest,
        {
          headers: {
            "Content-Type": "application/json",
            "x-merchant-api-key": aggregator.apiToken,
          },
          timeout: 30000, // 30 секунд для выплат
          httpsAgent: this.httpsAgent, // Используем агент с отключенной проверкой SSL
        }
      );

      if (response.status === 200 || response.status === 201) {
        console.log(
          `[ChaseAdapter] Payout sent successfully to Chase aggregator:`,
          {
            aggregatorId,
            payoutId: payout.id,
            chasePayoutId: response.data.payoutId,
          }
        );

        // Обновляем выплату, указывая что она отправлена на Chase-агрегатор
        await db.payout.update({
          where: { id: payout.id },
          data: {
            status: "PROCESSING",
            traderId: aggregatorId, // Используем ID агрегатора как traderId
            externalReference: response.data.payoutId,
            merchantMetadata: {
              ...payout.merchantMetadata,
              chaseAggregatorId: aggregatorId,
              chasePayoutId: response.data.payoutId,
              sentToChaseAt: new Date().toISOString(),
            },
          },
        });

        return {
          success: true,
          payoutId: response.data.payoutId,
          message: "Payout sent to Chase aggregator successfully",
        };
      } else {
        return {
          success: false,
          error: `Chase aggregator returned status ${response.status}`,
          message: response.data?.message || "Unknown error",
        };
      }
    } catch (error) {
      console.error(
        `[ChaseAdapter] Error sending payout to Chase aggregator:`,
        error
      );

      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.response?.data?.message || error.message,
          message: `Chase aggregator error: ${error.response?.status}`,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        message: "Failed to send payout to Chase aggregator",
      };
    }
  }

  /**
   * Получить доступных Chase-агрегаторов для выплат
   */
  async getAvailableChaseAggregatorsForPayout(
    merchantId: string,
    methodId?: string
  ): Promise<any[]> {
    const aggregators = await db.aggregator.findMany({
      where: {
        isChaseProject: true,
        isActive: true,
        apiBaseUrl: { not: null },
        // Проверяем, что агрегатор работает с этим мерчантом и методом
        ...(methodId
          ? {
              merchants: {
                some: {
                  merchantId: merchantId,
                  methodId: methodId,
                  isTrafficEnabled: true,
                },
              },
            }
          : {
              merchants: {
                some: {
                  merchantId: merchantId,
                  isTrafficEnabled: true,
                },
              },
            }),
      },
      orderBy: {
        priority: "desc",
      },
    });

    return aggregators;
  }
}

export const chaseAdapterService = ChaseAdapterService.getInstance();
