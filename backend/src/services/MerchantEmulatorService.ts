import { BaseService } from './BaseService';
import { db } from '../db';
import { randomBytes } from 'node:crypto';
import { TransactionType } from '@prisma/client';
import { Elysia, t } from 'elysia';

interface Method {
  id: string;
  code: string;
  name: string;
  type: string;
  currency: string;
  minPayin: number;
  maxPayin: number;
}

export class MerchantEmulatorService extends BaseService {
  displayName = 'Эмулятор мерчанта';
  description = 'Создает тестовые транзакции от имени тестового мерчанта';
  interval = 5000; // Проверяем каждые 5 секунд
  enabledByDefault = false; // По умолчанию выключен
  autoStart = false; // По умолчанию не запускается
  tags = ['emulator', 'testing'];

  private merchantToken: string | null = null;
  private merchantId: string | null = null;
  private availableMethods: Method[] = [];
  private lastTransactionTime: number = 0;
  private nextInterval: number = 5000; // Начальный интервал
  private callbackTokens: Map<string, string> = new Map(); // token -> transactionId
  
  // Настройки диапазона сумм
  private minAmount: number = 100; // Минимальная сумма по умолчанию
  private maxAmount: number = 30000; // Максимальная сумма по умолчанию (30000 руб)

  constructor() {
    super({
      displayName: 'Эмулятор мерчанта',
      description: 'Создает тестовые транзакции от имени тестового мерчанта',
      enabled: false,
      autoStart: false,
      tags: ['emulator', 'testing']
    });
    this.setupCallbackEndpoint();
    this.setupConfigEndpoints();
  }

  private setupCallbackEndpoint() {
    this.addEndpoint({
      method: 'POST',
      path: '/callback/:token',
      handler: async ({ params, body, set }: any) => {
        const transactionId = this.callbackTokens.get(params.token);
        
        if (!transactionId) {
          set.status = 404;
          return { error: 'Invalid callback token' };
        }

        // Удаляем токен после использования (одноразовый)
        this.callbackTokens.delete(params.token);

        await this.logInfo('Получен callback для транзакции', {
          transactionId,
          token: params.token,
          body
        });

        // Увеличиваем счетчик полученных колбэков
        const callbacksReceived = this.getSetting('callbacksReceived', 0);
        await this.setSetting('callbacksReceived', callbacksReceived + 1);

        set.status = 200;
        return { success: true, transactionId };
      },
      schema: {
        params: t.Object({
          token: t.String()
        }),
        body: t.Any()
      }
    });
  }

  private setupConfigEndpoints() {
    // Endpoint для получения текущих настроек
    this.addEndpoint({
      method: 'GET',
      path: '/config',
      handler: async ({ set }: any) => {
        set.status = 200;
        return {
          minAmount: this.minAmount,
          maxAmount: this.maxAmount,
          currentSettings: {
            minAmount: this.getSetting('minAmount', this.minAmount),
            maxAmount: this.getSetting('maxAmount', this.maxAmount)
          }
        };
      },
      schema: {}
    });

    // Endpoint для обновления настроек диапазона сумм
    this.addEndpoint({
      method: 'POST',
      path: '/config/amount-range',
      handler: async ({ body, set }: any) => {
        const { minAmount, maxAmount } = body;
        
        // Валидация
        if (minAmount && minAmount < 1) {
          set.status = 400;
          return { error: 'Минимальная сумма должна быть больше 0' };
        }
        
        if (maxAmount && maxAmount < 1) {
          set.status = 400;
          return { error: 'Максимальная сумма должна быть больше 0' };
        }
        
        if (minAmount && maxAmount && minAmount > maxAmount) {
          set.status = 400;
          return { error: 'Минимальная сумма не может быть больше максимальной' };
        }
        
        // Обновляем настройки
        if (minAmount !== undefined) {
          this.minAmount = minAmount;
          await this.setSetting('minAmount', minAmount);
        }
        
        if (maxAmount !== undefined) {
          this.maxAmount = maxAmount;
          await this.setSetting('maxAmount', maxAmount);
        }
        
        await this.logInfo('Обновлены настройки диапазона сумм', {
          minAmount: this.minAmount,
          maxAmount: this.maxAmount
        });
        
        set.status = 200;
        return {
          success: true,
          minAmount: this.minAmount,
          maxAmount: this.maxAmount
        };
      },
      schema: {
        body: t.Object({
          minAmount: t.Optional(t.Number()),
          maxAmount: t.Optional(t.Number())
        })
      }
    });
  }

  protected getPublicFields() {
    return {
      merchantToken: this.merchantToken,
      merchantId: this.merchantId,
      availableMethodsCount: this.availableMethods.length,
      lastTransactionTime: this.lastTransactionTime,
      nextInterval: this.nextInterval,
      createdTransactions: this.getSetting('createdTransactions', 0),
      successfulTransactions: this.getSetting('successfulTransactions', 0),
      failedTransactions: this.getSetting('failedTransactions', 0),
      callbacksReceived: this.getSetting('callbacksReceived', 0),
      minAmount: this.minAmount,
      maxAmount: this.maxAmount,
    };
  }


  async onStart() {
    await this.logInfo('Инициализация эмулятора мерчанта');
    
    // Загружаем сохраненные настройки
    this.minAmount = this.getSetting('minAmount', 100);
    this.maxAmount = this.getSetting('maxAmount', 30000);
    
    await this.logInfo('Загружены настройки диапазона сумм', {
      minAmount: this.minAmount,
      maxAmount: this.maxAmount
    });
    
    await this.initializeMerchant();
  }

  async tick() {
    const now = Date.now();
    
    // Проверяем, пришло ли время создавать новую транзакцию
    if (now - this.lastTransactionTime < this.nextInterval) {
      return;
    }

    // Создаем транзакцию
    await this.createTransaction();
    
    // Обновляем время последней транзакции
    this.lastTransactionTime = now;
    
    // Генерируем новый случайный интервал от 1 до 10 секунд
    this.nextInterval = Math.floor(Math.random() * 9000) + 1000;
    
    await this.updatePublicFieldsInDb(this.getPublicFields());
  }

  private async initializeMerchant() {
    try {
      // Ищем или создаем тестового мерчанта
      let merchant = await db.merchant.findFirst({
        where: { name: 'test' }
      });

      if (!merchant) {
        const token = randomBytes(32).toString('hex');
        merchant = await db.merchant.create({
          data: {
            name: 'test',
            token: token,
            disabled: false,
            banned: false,
            balanceUsdt: 0
          }
        });
        await this.logInfo('Создан новый тестовый мерчант', { id: merchant.id });
      }

      this.merchantToken = merchant.token;
      this.merchantId = merchant.id;

      // Загружаем доступные методы
      await this.loadAvailableMethods();

    } catch (error) {
      await this.logError('Ошибка инициализации мерчанта', { error });
      throw error;
    }
  }

  private async loadAvailableMethods() {
    if (!this.merchantId) return;

    try {
      // Сначала проверяем, есть ли вообще методы в системе
      const allMethods = await db.method.findMany({
        where: {
          isEnabled: true,
          type: 'c2c'
        }
      });

      await this.logInfo(`Найдено ${allMethods.length} активных методов типа c2c в системе`);

      // Если методов нет в системе, создаем тестовый метод
      if (allMethods.length === 0) {
        await this.logWarn('В системе нет активных методов типа c2c. Создаем тестовый метод.');
        
        const testMethod = await db.method.create({
          data: {
            code: 'TEST_C2C',
            name: 'Тестовый перевод',
            type: 'c2c',
            currency: 'rub',
            isEnabled: true,
            minPayin: 100,
            maxPayin: 100000,
            minPayout: 100,
            maxPayout: 100000,
            commissionPayin: 0,
            commissionPayout: 0,
            chancePayin: 1.0,
            chancePayout: 1.0
          }
        });

        allMethods.push(testMethod);
      }

      // Проверяем, есть ли связи методов с мерчантом
      const merchantMethods = await db.merchantMethod.findMany({
        where: { 
          merchantId: this.merchantId,
          isEnabled: true 
        },
        include: {
          method: true
        }
      });

      await this.logInfo(`У мерчанта ${this.merchantId} найдено ${merchantMethods.length} активных методов`);

      // Если у мерчанта нет методов, добавляем все доступные
      if (merchantMethods.length === 0) {
        await this.logWarn('У тестового мерчанта нет активных методов. Добавляем все доступные методы.');
        
        for (const method of allMethods) {
          await db.merchantMethod.create({
            data: {
              merchantId: this.merchantId,
              methodId: method.id,
              isEnabled: true
            }
          });
        }

        // Перезагружаем методы мерчанта
        const updatedMerchantMethods = await db.merchantMethod.findMany({
          where: { 
            merchantId: this.merchantId,
            isEnabled: true 
          },
          include: {
            method: true
          }
        });

        this.availableMethods = updatedMerchantMethods
          .filter(mm => mm.method.isEnabled && mm.method.type === 'c2c')
          .map(mm => ({
            id: mm.method.id,
            code: mm.method.code,
            name: mm.method.name,
            type: mm.method.type,
            currency: mm.method.currency,
            minPayin: mm.method.minPayin,
            maxPayin: mm.method.maxPayin
          }));
      } else {
        this.availableMethods = merchantMethods
          .filter(mm => mm.method.isEnabled && mm.method.type === 'c2c')
          .map(mm => ({
            id: mm.method.id,
            code: mm.method.code,
            name: mm.method.name,
            type: mm.method.type,
            currency: mm.method.currency,
            minPayin: mm.method.minPayin,
            maxPayin: mm.method.maxPayin
          }));
      }

      await this.logInfo(`Загружено ${this.availableMethods.length} доступных методов для эмулятора`);

    } catch (error) {
      await this.logError('Ошибка загрузки методов', { error });
    }
  }

  private async createTransaction() {
    if (!this.merchantToken || !this.merchantId || this.availableMethods.length === 0) {
      await this.logWarn('Невозможно создать транзакцию: не инициализирован мерчант или нет доступных методов');
      return;
    }

    try {
      // Выбираем случайный метод
      const method = this.availableMethods[Math.floor(Math.random() * this.availableMethods.length)];
      
      // Определяем эффективные лимиты с учетом настроек сервиса и метода
      const effectiveMinAmount = Math.max(this.minAmount, method.minPayin);
      const effectiveMaxAmount = Math.min(
        this.maxAmount, 
        method.maxPayin > 0 ? method.maxPayin : this.maxAmount
      );
      
      // Генерируем случайную сумму в рамках эффективных лимитов
      const amount = Math.floor(Math.random() * (effectiveMaxAmount - effectiveMinAmount)) + effectiveMinAmount;
      
      // Логируем для отладки
      console.log(`[MerchantEmulator] Generating transaction: method=${method.code}, service limits=${this.minAmount}-${this.maxAmount}, method limits=${method.minPayin}-${method.maxPayin}, effective limits=${effectiveMinAmount}-${effectiveMaxAmount}, amount=${amount}`);
      
      // Генерируем случайный курс от 90 до 110
      const rate = 90 + Math.random() * 20;
      
      // Генерируем уникальный orderId
      const orderId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Генерируем дату истечения через 1 час
      const expired_at = new Date(Date.now() + 3600000).toISOString();
      
      // Генерируем случайный IP
      const userIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      
      // Создаем только IN транзакции (даже если нет реквизитов - уйдут в MILK)
      const type = TransactionType.IN;

      // Генерируем уникальные токены для callback URL
      const callbackToken = randomBytes(16).toString('hex');
      const successToken = randomBytes(16).toString('hex');
      const failToken = randomBytes(16).toString('hex');

      const port = process.env.PORT || '3001';
      const baseUrl = process.env.API_URL || `http://localhost:${port}/api`;
      const callbackUri = `${baseUrl}/service/merchantemulatorservice/callback/${callbackToken}`;
      const successUri = `${baseUrl}/service/merchantemulatorservice/callback/${successToken}`;
      const failUri = `${baseUrl}/service/merchantemulatorservice/callback/${failToken}`;

      // Создаем транзакцию через новый API (используем endpoint в зависимости от типа)
      const endpoint = type === TransactionType.IN ? 'in' : 'out';
      const response = await fetch(`${baseUrl}/merchant/transactions/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-merchant-api-key': this.merchantToken
        },
        body: JSON.stringify({
          amount,
          orderId,
          methodId: method.id,
          rate,
          expired_at,
          userIp,
          callbackUri
        })
      });

      if (response.ok) {
        const transaction = await response.json();
        
        // Сохраняем токены для отслеживания колбэков
        this.callbackTokens.set(callbackToken, transaction.id);
        this.callbackTokens.set(successToken, transaction.id);
        this.callbackTokens.set(failToken, transaction.id);
        
        await this.logInfo('Создана транзакция', {
          id: transaction.id,
          amount,
          method: method.name,
          type,
          rate: rate.toFixed(2),
          callbackUri,
          successUri,
          failUri
        });
        
        const created = this.getSetting('createdTransactions', 0);
        const successful = this.getSetting('successfulTransactions', 0);
        await this.setSetting('createdTransactions', created + 1);
        await this.setSetting('successfulTransactions', successful + 1);
      } else {
        const error = await response.text();
        await this.logError('Ошибка создания транзакции', { 
          status: response.status, 
          error,
          method: method.name,
          amount 
        });
        
        const created = this.getSetting('createdTransactions', 0);
        const failed = this.getSetting('failedTransactions', 0);
        await this.setSetting('createdTransactions', created + 1);
        await this.setSetting('failedTransactions', failed + 1);
      }

    } catch (error) {
      await this.logError('Ошибка при создании транзакции', { error });
      
      const failed = this.getSetting('failedTransactions', 0);
      await this.setSetting('failedTransactions', failed + 1);
    }

    // Периодически перезагружаем методы (каждые 50 транзакций)
    const created = this.getSetting('createdTransactions', 0);
    if (created % 50 === 0) {
      await this.loadAvailableMethods();
    }
  }

  async onStop() {
    await this.logInfo('Остановка эмулятора мерчанта');
  }
}

export default MerchantEmulatorService;