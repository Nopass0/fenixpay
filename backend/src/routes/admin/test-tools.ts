import { Elysia, t } from "elysia";
import { db } from "@/db";
import { BankType, MethodType, TransactionStatus } from "@prisma/client";
import ErrorSchema from "@/types/error";
import { randomInt } from "crypto";
import { rapiraService } from "@/services/rapira.service";

// Helper function to get next transaction numeric ID
async function getNextTransactionId(): Promise<number> {
  const lastTransaction = await db.transaction.findFirst({
    orderBy: { numericId: 'desc' },
    select: { numericId: true }
  });
  return (lastTransaction?.numericId || 0) + 1;
}

const AuthHeader = t.Object({ 'x-admin-key': t.String() });

const bankTypes = [
  "SBERBANK", "TINKOFF", "VTB", "ALFABANK", "GAZPROMBANK", 
  "RAIFFEISEN", "POCHTABANK", "SOVCOMBANK", "BSPB", "RSHB"
];

const methodTypes = ["CARD", "SBP", "QIWI", "YOOMONEY"];

const transactionStatuses = ["PENDING", "ACCEPTED", "READY", "EXPIRED", "CANCELLED"];

const payoutStatuses = ["CREATED", "ACTIVE", "CHECKING", "COMPLETED", "CANCELLED"];

const messageTypes = ["AppNotification", "SMS"];

const sampleMessages = [
  "Поступление 2,500 руб. на карту *1234 от SBERBANK",
  "Получено 5,000 руб. от Тинькофф на карту *5678", 
  "Поступил перевод 1,200 руб. через СБП от ВТБ",
  "Зачислено 3,800 руб. на карту *9012 от Альфа-Банка",
  "Получен платеж 750 руб. от Газпромбанка",
  "Поступление 4,300 руб. на карту *3456 от Райффайзен",
  "Зачислено 2,100 руб. через Fast Payment от Ozon Bank",
  "Получено 6,500 руб. от Почта Банка на карту *7890",
  "Поступил перевод 1,950 руб. от Совкомбанка",
  "Зачислено 3,200 руб. на карту *2345 от Росбанка",
  "Получен платеж 850 руб. от МКБ через СБП",
  "Поступление 4,750 руб. на карту *6789 от Открытие"
];

const getRandomElement = <T>(array: T[]): T => {
  return array[randomInt(array.length)];
};

const getRandomAmount = (min: number, max: number): number => {
  return randomInt(min, max + 1);
};

const getRandomCardNumber = (): string => {
  const prefix = "4111";
  const middle = Math.random().toString().slice(2, 10);
  const suffix = Math.random().toString().slice(2, 6);
  return `${prefix}${middle}${suffix}`;
};

const getRandomName = (): string => {
  const names = [
    "Иван Иванов", "Петр Петров", "Сергей Сергеев", "Александр Александров",
    "Дмитрий Дмитриев", "Андрей Андреев", "Максим Максимов", "Артем Артемов"
  ];
  return getRandomElement(names);
};

export const testToolsRoutes = new Elysia()
  // Get merchants list
  .get("/merchants", async () => {
    const merchants = await db.merchant.findMany({
      where: { 
        disabled: false,
        banned: false 
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    return { merchants };
  }, {
    headers: AuthHeader,
    response: {
      200: t.Object({
        merchants: t.Array(t.Object({
          id: t.String(),
          name: t.String(),
        })),
      }),
      401: ErrorSchema,
      403: ErrorSchema,
    },
  })
  
  // Get traders list
  .get("/traders", async () => {
    const traders = await db.user.findMany({
      where: { role: "TRADER" },
      select: { id: true, email: true, name: true },
      orderBy: { email: "asc" },
    });
    return { traders };
  }, {
    headers: AuthHeader,
    response: {
      200: t.Object({
        traders: t.Array(t.Object({
          id: t.String(),
          email: t.String(),
          name: t.Nullable(t.String()),
        })),
      }),
      401: ErrorSchema,
      403: ErrorSchema,
    },
  })
  
  // Create random deals
  .post(
    "/deals",
    async ({ body, set }) => {
      try {
        const { count, minAmount, maxAmount, merchantId, traderId, useRandomData, autoConfirm, simulateErrors } = body;
        
        if (count < 1 || count > 50) {
          set.status = 400;
          return { success: false, error: "Количество сделок должно быть от 1 до 50" };
        }

        // Get available merchants and traders
        const merchants = await db.merchant.findMany({
          where: { 
            disabled: false,
            banned: false 
          },
          take: 10,
        });
        
        const traders = await db.user.findMany({
          where: { role: "TRADER" },
          take: 10,
        });
        
        const methods = await db.method.findMany({
          where: { isEnabled: true },
          take: 5,
        });

        if (merchants.length === 0 || traders.length === 0 || methods.length === 0) {
          set.status = 400;
          return { success: false, error: "Недостаточно данных для создания сделок" };
        }

        const createdDeals = [];
        const errors = [];

        for (let i = 0; i < count; i++) {
          try {
            // Simulate random errors if enabled
            if (simulateErrors && Math.random() < 0.1) {
              throw new Error("Симулированная ошибка");
            }

            const merchant = merchantId ? 
              merchants.find(m => m.id === merchantId) || getRandomElement(merchants) :
              getRandomElement(merchants);
            
            const trader = traderId ?
              traders.find(t => t.id === traderId) || getRandomElement(traders) :
              getRandomElement(traders);

            const method = getRandomElement(methods);
            
            // Create or find requisite for the trader with matching method type
            let requisite = await db.bankDetail.findFirst({
              where: { 
                userId: trader.id,
                isArchived: false,
                methodType: method.type, // Match method type!
                OR: [
                  { deviceId: null }, // BT requisite
                  { 
                    device: {
                      isOnline: true,
                      isWorking: true
                    }
                  }
                ]
              },
              include: {
                device: true
              }
            });

            // If no requisite found, skip this transaction
            if (!requisite) {
              errors.push(`Сделка ${i + 1}: Нет реквизита для метода ${method.type}`);
              continue;
            }

            // Generate amount within requisite limits
            const reqMinAmount = Math.max(requisite.minAmount, trader.minAmountPerRequisite, minAmount);
            const reqMaxAmount = Math.min(requisite.maxAmount, trader.maxAmountPerRequisite, maxAmount);
            
            if (reqMinAmount > reqMaxAmount) {
              errors.push(`Сделка ${i + 1}: Несовместимые лимиты суммы для реквизита`);
              continue;
            }
            
            const amount = getRandomAmount(Math.floor(reqMinAmount), Math.floor(reqMaxAmount));


            // Get current Rapira rates
            const rapiraBaseRate = await rapiraService.getUsdtRubRate();
            const rateSettingRecord = await db.rateSetting.findFirst({ where: { id: 1 } });
            const rapiraKkk = rateSettingRecord?.rapiraKkk || 0;
            const rapiraRateWithKkk = await rapiraService.getRateWithKkk(rapiraKkk);
            
            // Determine merchant rate based on settings
            const merchantRate = merchant.countInRubEquivalent ? rapiraBaseRate : useRandomData ? getRandomAmount(90, 110) : 95.0;
            
            const deal = await db.transaction.create({
              data: {
                numericId: await getNextTransactionId(),
                amount,
                merchantId: merchant.id,
                traderId: trader.id,
                methodId: method.id,
                bankDetailId: requisite.id,
                status: autoConfirm ? "ACCEPTED" : "PENDING",
                type: "IN",
                commission: amount * 0.03, // 3% commission
                rate: rapiraRateWithKkk, // Always Rapira rate with KKK for calculations
                merchantRate: merchantRate, // Merchant's display rate
                adjustedRate: rapiraRateWithKkk, // Deprecated, kept for compatibility
                ...(autoConfirm && { acceptedAt: new Date() }),
                ...(autoConfirm && { completedAt: new Date() }),
              },
            });

            createdDeals.push(deal);
          } catch (error: any) {
            errors.push(`Сделка ${i + 1}: ${error.message}`);
          }
        }

        return {
          success: true,
          created: createdDeals.length,
          errors: errors.length,
          details: {
            deals: createdDeals.map(d => ({ id: d.id, numericId: d.numericId, amount: d.amount })),
            errors,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      headers: AuthHeader,
      body: t.Object({
        count: t.Number({ minimum: 1, maximum: 50 }),
        minAmount: t.Number({ minimum: 1 }),
        maxAmount: t.Number({ minimum: 1 }),
        merchantId: t.Optional(t.String()),
        traderId: t.Optional(t.String()),
        useRandomData: t.Boolean(),
        autoConfirm: t.Boolean(),
        simulateErrors: t.Boolean(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          created: t.Number(),
          errors: t.Number(),
          details: t.Object({
            deals: t.Array(t.Object({
              id: t.String(),
              numericId: t.Number(),
              amount: t.Number(),
            })),
            errors: t.Array(t.String()),
          }),
        }),
        400: t.Object({
          success: t.Boolean(),
          error: t.String(),
        }),
        500: t.Object({
          success: t.Boolean(),
          error: t.String(),
        }),
      },
    }
  )

  // Create random payouts
  .post(
    "/payouts",
    async ({ body, set }) => {
      try {
        const { count, minAmount, maxAmount, merchantId, useRandomData, autoConfirm, simulateErrors } = body;
        
        if (count < 1 || count > 50) {
          set.status = 400;
          return { success: false, error: "Количество выплат должно быть от 1 до 50" };
        }

        // Get available merchants and traders
        const merchants = await db.merchant.findMany({
          where: { 
            disabled: false,
            banned: false 
          },
          take: 10,
        });
        
        const traders = await db.user.findMany({
          where: { role: "TRADER" },
          take: 10,
        });

        if (merchants.length === 0 || traders.length === 0) {
          set.status = 400;
          return { success: false, error: "Недостаточно данных для создания выплат" };
        }

        const createdPayouts = [];
        const errors = [];

        for (let i = 0; i < count; i++) {
          try {
            // Simulate random errors if enabled
            if (simulateErrors && Math.random() < 0.1) {
              throw new Error("Симулированная ошибка");
            }

            const merchant = merchantId ? 
              merchants.find(m => m.id === merchantId) || getRandomElement(merchants) :
              getRandomElement(merchants);
            const trader = getRandomElement(traders);
            const amount = getRandomAmount(minAmount, maxAmount);
            const amountUsdt = amount / 100; // Convert to USDT

            const payout = await db.payout.create({
              data: {
                numericId: await getNextPayoutId(),
                amount,
                amountUsdt,
                total: amount,
                totalUsdt: amountUsdt,
                rate: 100,
                wallet: useRandomData ? `TRX${Math.random().toString(36).slice(2, 20)}` : "TRX123456789",
                bank: getRandomElement(bankTypes),
                isCard: Math.random() > 0.5,
                status: autoConfirm ? "ACTIVE" : "CREATED",
                merchantId: merchant.id,
                traderId: trader.id,
                expireAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
                ...(autoConfirm && { acceptedAt: new Date() }),
              },
            });

            createdPayouts.push(payout);
          } catch (error: any) {
            errors.push(`Выплата ${i + 1}: ${error.message}`);
          }
        }

        return {
          success: true,
          created: createdPayouts.length,
          errors: errors.length,
          details: {
            payouts: createdPayouts.map(p => ({ id: p.id, numericId: p.numericId, amount: p.amount })),
            errors,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      headers: AuthHeader,
      body: t.Object({
        count: t.Number({ minimum: 1, maximum: 50 }),
        minAmount: t.Number({ minimum: 1 }),
        maxAmount: t.Number({ minimum: 1 }),
        merchantId: t.Optional(t.String()),
        useRandomData: t.Boolean(),
        autoConfirm: t.Boolean(),
        simulateErrors: t.Boolean(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          created: t.Number(),
          errors: t.Number(),
          details: t.Object({
            payouts: t.Array(t.Object({
              id: t.String(),
              numericId: t.Number(),
              amount: t.Number(),
            })),
            errors: t.Array(t.String()),
          }),
        }),
        400: t.Object({
          success: t.Boolean(),
          error: t.String(),
        }),
        500: t.Object({
          success: t.Boolean(),
          error: t.String(),
        }),
      },
    }
  )

  // Create random messages
  .post(
    "/messages",
    async ({ body, set }) => {
      try {
        const { count, type, content, useRandomData, simulateErrors } = body;
        
        if (count < 1 || count > 100) {
          set.status = 400;
          return { success: false, error: "Количество сообщений должно быть от 1 до 100" };
        }

        // Get available devices
        const devices = await db.device.findMany({
          take: 20,
        });

        if (devices.length === 0) {
          set.status = 400;
          return { success: false, error: "Недостаточно устройств для создания сообщений" };
        }

        const createdMessages = [];
        const errors = [];

        for (let i = 0; i < count; i++) {
          try {
            // Simulate random errors if enabled
            if (simulateErrors && Math.random() < 0.1) {
              throw new Error("Симулированная ошибка");
            }

            const device = getRandomElement(devices);
            const messageContent = content || (useRandomData ? getRandomElement(sampleMessages) : "Тестовое сообщение");

            const notificationType = type === "notification" ? "AppNotification" : 
                                   type === "sms" ? "SMS" : 
                                   "AppNotification";
            
            const message = await db.notification.create({
              data: {
                deviceId: device.id,
                type: notificationType,
                application: useRandomData ? `com.${getRandomElement(bankTypes).toLowerCase()}.mobile` : "test.app",
                title: `Уведомление ${i + 1}`,
                message: messageContent,
                metadata: useRandomData ? { test: true, index: i } : {},
                isRead: Math.random() > 0.7, // 30% chance of being read
              },
            });

            createdMessages.push(message);
          } catch (error: any) {
            errors.push(`Сообщение ${i + 1}: ${error.message}`);
          }
        }

        return {
          success: true,
          created: createdMessages.length,
          errors: errors.length,
          details: {
            messages: createdMessages.map(m => ({ id: m.id, type: m.type, title: m.title })),
            errors,
          },
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      headers: AuthHeader,
      body: t.Object({
        count: t.Number({ minimum: 1, maximum: 100 }),
        type: t.String(),
        content: t.Optional(t.String()),
        useRandomData: t.Boolean(),
        simulateErrors: t.Boolean(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          created: t.Number(),
          errors: t.Number(),
          details: t.Object({
            messages: t.Array(t.Object({
              id: t.String(),
              type: t.String(),
              title: t.String(),
            })),
            errors: t.Array(t.String()),
          }),
        }),
        400: t.Object({
          success: t.Boolean(),
          error: t.String(),
        }),
        500: t.Object({
          success: t.Boolean(),
          error: t.String(),
        }),
      },
    }
  )

  // Run full system test
  .post(
    "/full-test",
    async ({ body, set }) => {
      try {
        const { dealCount, payoutCount, messageCount, useRandomData, simulateErrors } = body;
        
        const results = {
          deals: { created: 0, errors: 0 },
          payouts: { created: 0, errors: 0 },
          messages: { created: 0, errors: 0 },
          totalErrors: [] as string[],
        };

        // Create deals
        try {
          const dealResult = await createRandomDeals(dealCount, 1000, 10000, useRandomData, false, simulateErrors);
          results.deals = { created: dealResult.created, errors: dealResult.errors };
          if (dealResult.errorList) results.totalErrors.push(...dealResult.errorList);
        } catch (error: any) {
          results.totalErrors.push(`Deals: ${error.message}`);
        }

        // Create payouts
        try {
          const payoutResult = await createRandomPayouts(payoutCount, 500, 5000, useRandomData, false, simulateErrors);
          results.payouts = { created: payoutResult.created, errors: payoutResult.errors };
          if (payoutResult.errorList) results.totalErrors.push(...payoutResult.errorList);
        } catch (error: any) {
          results.totalErrors.push(`Payouts: ${error.message}`);
        }

        // Create messages
        try {
          const messageResult = await createRandomMessages(messageCount, "notification", useRandomData, simulateErrors);
          results.messages = { created: messageResult.created, errors: messageResult.errors };
          if (messageResult.errorList) results.totalErrors.push(...messageResult.errorList);
        } catch (error: any) {
          results.totalErrors.push(`Messages: ${error.message}`);
        }

        return {
          success: true,
          details: results,
        };
      } catch (error: any) {
        set.status = 500;
        return { success: false, error: error.message };
      }
    },
    {
      headers: AuthHeader,
      body: t.Object({
        dealCount: t.Number({ minimum: 1, maximum: 50 }),
        payoutCount: t.Number({ minimum: 1, maximum: 50 }),
        messageCount: t.Number({ minimum: 1, maximum: 100 }),
        useRandomData: t.Boolean(),
        simulateErrors: t.Boolean(),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          details: t.Object({
            deals: t.Object({
              created: t.Number(),
              errors: t.Number(),
            }),
            payouts: t.Object({
              created: t.Number(),
              errors: t.Number(),
            }),
            messages: t.Object({
              created: t.Number(),
              errors: t.Number(),
            }),
            totalErrors: t.Array(t.String()),
          }),
        }),
        500: t.Object({
          success: t.Boolean(),
          error: t.String(),
        }),
      },
    }
  );

// Helper functions
async function getNextTransactionId(): Promise<number> {
  const lastTransaction = await db.transaction.findFirst({
    orderBy: { numericId: "desc" },
    select: { numericId: true },
  });
  return (lastTransaction?.numericId || 0) + 1;
}

async function getNextPayoutId(): Promise<number> {
  const lastPayout = await db.payout.findFirst({
    orderBy: { numericId: "desc" },
    select: { numericId: true },
  });
  return (lastPayout?.numericId || 0) + 1;
}

async function createRandomDeals(count: number, minAmount: number, maxAmount: number, useRandomData: boolean, autoConfirm: boolean, simulateErrors: boolean) {
  const merchants = await db.merchant.findMany({ where: { isActive: true }, take: 10 });
  const traders = await db.user.findMany({ where: { role: "TRADER" }, take: 10 });
  const methods = await db.method.findMany({ where: { isEnabled: true }, take: 5 });

  const created = [];
  const errors = [];

  for (let i = 0; i < count; i++) {
    try {
      if (simulateErrors && Math.random() < 0.1) {
        throw new Error("Симулированная ошибка");
      }

      const merchant = getRandomElement(merchants);
      const trader = getRandomElement(traders);
      const method = getRandomElement(methods);
      const amount = getRandomAmount(minAmount, maxAmount);

      const deal = await db.transaction.create({
        data: {
          numericId: await getNextTransactionId(),
          amount,
          merchantId: merchant.id,
          traderId: trader.id,
          methodId: method.id,
          status: autoConfirm ? "ACCEPTED" : "PENDING",
          type: "IN",
          commission: amount * 0.03,
          rate: 1.0,
          ...(autoConfirm && { acceptedAt: new Date() }),
        },
      });

      created.push(deal);
    } catch (error: any) {
      errors.push(`Deal ${i + 1}: ${error.message}`);
    }
  }

  return { created: created.length, errors: errors.length, errorList: errors };
}

async function createRandomPayouts(count: number, minAmount: number, maxAmount: number, useRandomData: boolean, autoConfirm: boolean, simulateErrors: boolean) {
  const merchants = await db.merchant.findMany({ where: { isActive: true }, take: 10 });
  const traders = await db.user.findMany({ where: { role: "TRADER" }, take: 10 });

  const created = [];
  const errors = [];

  for (let i = 0; i < count; i++) {
    try {
      if (simulateErrors && Math.random() < 0.1) {
        throw new Error("Симулированная ошибка");
      }

      const merchant = getRandomElement(merchants);
      const trader = getRandomElement(traders);
      const amount = getRandomAmount(minAmount, maxAmount);

      const payout = await db.payout.create({
        data: {
          numericId: await getNextPayoutId(),
          amount,
          amountUsdt: amount / 100,
          total: amount,
          totalUsdt: amount / 100,
          rate: 100,
          wallet: `TRX${Math.random().toString(36).slice(2, 20)}`,
          bank: getRandomElement(bankTypes),
          isCard: Math.random() > 0.5,
          status: autoConfirm ? "ACTIVE" : "CREATED",
          merchantId: merchant.id,
          traderId: trader.id,
          expireAt: new Date(Date.now() + 30 * 60 * 1000),
          ...(autoConfirm && { acceptedAt: new Date() }),
        },
      });

      created.push(payout);
    } catch (error: any) {
      errors.push(`Payout ${i + 1}: ${error.message}`);
    }
  }

  return { created: created.length, errors: errors.length, errorList: errors };
}

async function createRandomMessages(count: number, type: string, useRandomData: boolean, simulateErrors: boolean) {
  const devices = await db.device.findMany({ take: 20 });

  const created = [];
  const errors = [];

  for (let i = 0; i < count; i++) {
    try {
      if (simulateErrors && Math.random() < 0.1) {
        throw new Error("Симулированная ошибка");
      }

      const device = getRandomElement(devices);
      const messageContent = useRandomData ? getRandomElement(sampleMessages) : "Тестовое сообщение";

      const notificationType = type === "notification" ? "AppNotification" : 
                         type === "sms" ? "SMS" : 
                         "AppNotification";
      
      const message = await db.notification.create({
        data: {
          deviceId: device.id,
          type: notificationType,
          application: `com.${getRandomElement(bankTypes).toLowerCase()}.mobile`,
          title: `Уведомление ${i + 1}`,
          message: messageContent,
          metadata: useRandomData ? { test: true, index: i } : {},
          isRead: Math.random() > 0.7,
        },
      });

      created.push(message);
    } catch (error: any) {
      errors.push(`Message ${i + 1}: ${error.message}`);
    }
  }

  return { created: created.length, errors: errors.length, errorList: errors };
}