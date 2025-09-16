import { BaseService } from "./BaseService";
import { ServiceRegistry } from "./ServiceRegistry";
import { faker } from "@faker-js/faker";
import { db } from "../db";
import type { Merchant, Prisma } from "@prisma/client";

export interface MockTransactionData {
  type: "deal" | "withdrawal";
  amount: number;
  currency?: string;
  cardNumber?: string;
  bank?: string;
  wallet?: string;
  externalReference?: string;
  webhookUrl?: string;
  metadata?: any;
}

export interface BatchGenerationOptions {
  merchantId: string;
  transactionType: "deal" | "withdrawal";
  count: number;
  minAmount?: number;
  maxAmount?: number;
  currency?: string;
  delayMs?: number;
}

export class MerchantEmulatorService extends BaseService {
  public readonly autoStart = false;

  constructor() {
    super();
    this.interval = 60000; // 1 minute tick for cleanup
  }

  protected async onStart(): Promise<void> {
    await this.logInfo("Merchant Emulator Service starting");
    await this.logInfo("Using PostgreSQL for emulator logs");
    
    // Ensure emulator logs table exists
    try {
      await db.$executeRaw`
        CREATE TABLE IF NOT EXISTS merchant_emulator_logs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
          timestamp TIMESTAMP DEFAULT NOW(),
          merchant_id TEXT NOT NULL,
          merchant_name TEXT NOT NULL,
          action TEXT NOT NULL,
          transaction_type TEXT NOT NULL,
          request JSONB,
          response JSONB,
          status TEXT NOT NULL,
          error TEXT,
          batch_id TEXT,
          batch_index INTEGER,
          batch_total INTEGER
        )
      `;
      
      // Create indexes
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_emulator_logs_timestamp ON merchant_emulator_logs(timestamp DESC)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_emulator_logs_merchant ON merchant_emulator_logs(merchant_id)`;
      await db.$executeRaw`CREATE INDEX IF NOT EXISTS idx_emulator_logs_batch ON merchant_emulator_logs(batch_id)`;
    } catch (error) {
      await this.logError("Failed to create emulator logs table", { error });
    }
    
    await this.logInfo("Merchant Emulator Service started");
  }

  protected async onStop(): Promise<void> {
    await this.logInfo("Merchant Emulator Service stopped");
  }

  protected async tick(): Promise<void> {
    // Cleanup old logs (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    try {
      const result = await db.$executeRaw`
        DELETE FROM merchant_emulator_logs 
        WHERE timestamp < ${thirtyDaysAgo}
      `;
      
      if (result > 0) {
        await this.logInfo(`Cleaned up ${result} old emulator logs`);
      }
    } catch (error) {
      await this.logError("Failed to cleanup old logs", { error });
    }
  }

  /**
   * Generate mock deal data
   */
  generateMockDeal(options?: Partial<MockTransactionData>): MockTransactionData {
    const banks = ["Sberbank", "Tinkoff", "VTB", "Alfa", "Raiffeisen", "PostBank"];
    
    return {
      type: "deal",
      amount: options?.amount || faker.number.int({ min: 1000, max: 50000 }),
      currency: options?.currency || "RUB",
      cardNumber: options?.cardNumber || this.generateCardNumber(),
      bank: options?.bank || faker.helpers.arrayElement(banks),
      externalReference: options?.externalReference || `EMU-${faker.string.alphanumeric(10)}`,
      webhookUrl: options?.webhookUrl,
      metadata: options?.metadata || {
        emulated: true,
        generatedAt: new Date().toISOString(),
        customerName: faker.person.fullName(),
        customerEmail: faker.internet.email(),
      }
    };
  }

  /**
   * Generate mock withdrawal data
   */
  generateMockWithdrawal(options?: Partial<MockTransactionData>): MockTransactionData {
    const banks = ["Sberbank", "Tinkoff", "VTB", "Alfa", "Raiffeisen", "PostBank"];
    
    return {
      type: "withdrawal",
      amount: options?.amount || faker.number.int({ min: 5000, max: 100000 }),
      currency: options?.currency || "RUB",
      wallet: options?.wallet || this.generateCardNumber(),
      bank: options?.bank || faker.helpers.arrayElement(banks),
      externalReference: options?.externalReference || `EMU-WD-${faker.string.alphanumeric(10)}`,
      webhookUrl: options?.webhookUrl,
      metadata: options?.metadata || {
        emulated: true,
        generatedAt: new Date().toISOString(),
        recipientName: faker.person.fullName(),
      }
    };
  }

  /**
   * Generate card number (16 digits)
   */
  private generateCardNumber(): string {
    const firstDigit = faker.helpers.arrayElement(["4", "5", "6"]); // Visa, Mastercard, Maestro
    const remainingDigits = faker.string.numeric(15);
    return firstDigit + remainingDigits;
  }

  /**
   * Send mock transaction to merchant API
   */
  async sendMockTransaction(
    merchantToken: string,
    transaction: MockTransactionData,
    merchantRate?: number
  ): Promise<any> {
    const merchant = await this.getMerchantByToken(merchantToken);
    if (!merchant) {
      throw new Error("Invalid merchant token");
    }

    const baseUrl = process.env.API_BASE_URL || "http://localhost:3000";
    const endpoint = transaction.type === "deal" 
      ? `${baseUrl}/api/merchant/deals`
      : `${baseUrl}/api/merchant/payouts`;

    const headers = {
      "Content-Type": "application/json",
      "X-API-Key": merchantToken,
    };

    let body: any;
    if (transaction.type === "deal") {
      body = {
        amount: transaction.amount,
        currency: transaction.currency || "RUB",
        cardNumber: transaction.cardNumber,
        bank: transaction.bank,
        externalReference: transaction.externalReference,
        webhookUrl: transaction.webhookUrl,
        metadata: transaction.metadata,
      };
    } else {
      body = {
        amount: transaction.amount,
        wallet: transaction.wallet,
        bank: transaction.bank,
        isCard: true,
        merchantRate: merchantRate || 100,
        externalReference: transaction.externalReference,
        webhookUrl: transaction.webhookUrl,
        metadata: transaction.metadata,
      };
    }

    const startTime = Date.now();
    let response: any;
    let status: "success" | "error" = "success";
    let error: string | undefined;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      response = await res.json();
      
      if (!res.ok) {
        status = "error";
        error = response.error || `HTTP ${res.status}`;
      }
    } catch (err: any) {
      status = "error";
      error = err.message;
      response = { error: err.message };
    }

    const duration = Date.now() - startTime;

    // Log to PostgreSQL
    await this.logEmulatorActivity({
      merchantId: merchant.id,
      merchantName: merchant.name,
      action: "send_transaction",
      transactionType: transaction.type,
      request: body,
      response,
      status,
      error,
    });

    await this.logInfo(`Mock ${transaction.type} sent`, {
      merchantId: merchant.id,
      status,
      duration,
      amount: transaction.amount,
    });

    return response;
  }

  /**
   * Generate and send batch of transactions
   */
  async generateBatch(options: BatchGenerationOptions): Promise<{
    batchId: string;
    successful: number;
    failed: number;
    results: any[];
  }> {
    if (options.count > 1000) {
      throw new Error("Batch size cannot exceed 1000 transactions");
    }

    const merchant = await this.getMerchantById(options.merchantId);
    if (!merchant) {
      throw new Error("Merchant not found");
    }

    const batchId = `BATCH-${faker.string.alphanumeric(12)}`;
    const results: any[] = [];
    let successful = 0;
    let failed = 0;

    await this.logInfo(`Starting batch generation`, {
      batchId,
      merchantId: merchant.id,
      type: options.transactionType,
      count: options.count,
    });

    for (let i = 0; i < options.count; i++) {
      // Generate transaction data
      const transaction = options.transactionType === "deal"
        ? this.generateMockDeal({
            amount: faker.number.int({ 
              min: options.minAmount || 1000, 
              max: options.maxAmount || 50000 
            }),
            currency: options.currency,
          })
        : this.generateMockWithdrawal({
            amount: faker.number.int({ 
              min: options.minAmount || 5000, 
              max: options.maxAmount || 100000 
            }),
            currency: options.currency,
          });

      try {
        const response = await this.sendMockTransaction(merchant.token, transaction);
        
        // Update batch log
        await this.updateBatchLog(batchId, i + 1, options.count);
        
        if (response.success || response.deal || response.payout) {
          successful++;
          results.push({ index: i, status: "success", response });
        } else {
          failed++;
          results.push({ index: i, status: "error", error: response.error });
        }
      } catch (error: any) {
        failed++;
        results.push({ index: i, status: "error", error: error.message });
      }

      // Add delay if specified
      if (options.delayMs && i < options.count - 1) {
        await new Promise(resolve => setTimeout(resolve, options.delayMs));
      }
    }

    await this.logInfo(`Batch generation completed`, {
      batchId,
      successful,
      failed,
      total: options.count,
    });

    return { batchId, successful, failed, results };
  }

  /**
   * Get emulator logs
   */
  async getLogs(filters: {
    merchantId?: string;
    batchId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    try {
      let whereConditions: string[] = [];
      let params: any[] = [];
      let paramIndex = 1;

      if (filters.merchantId) {
        whereConditions.push(`merchant_id = $${paramIndex++}`);
        params.push(filters.merchantId);
      }
      
      if (filters.batchId) {
        whereConditions.push(`batch_id = $${paramIndex++}`);
        params.push(filters.batchId);
      }
      
      if (filters.startDate) {
        whereConditions.push(`timestamp >= $${paramIndex++}`);
        params.push(filters.startDate);
      }
      
      if (filters.endDate) {
        whereConditions.push(`timestamp <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}` 
        : '';

      const limit = filters.limit || 100;
      const offset = filters.offset || 0;

      // Get logs
      const logs = await db.$queryRawUnsafe(`
        SELECT * FROM merchant_emulator_logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ${limit} OFFSET ${offset}
      `, ...params) as any[];

      // Get total count
      const countResult = await db.$queryRawUnsafe(`
        SELECT COUNT(*) as total FROM merchant_emulator_logs
        ${whereClause}
      `, ...params) as any[];

      const total = parseInt(countResult[0]?.total || "0");

      return { logs, total };
    } catch (error) {
      await this.logError("Failed to get logs", { error });
      return { logs: [], total: 0 };
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(merchantId?: string, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      let whereClause = `WHERE timestamp >= $1`;
      let params: any[] = [startDate];
      
      if (merchantId) {
        whereClause += ` AND merchant_id = $2`;
        params.push(merchantId);
      }

      const stats = await db.$queryRawUnsafe(`
        SELECT 
          transaction_type,
          status,
          COUNT(*) as count
        FROM merchant_emulator_logs
        ${whereClause}
        GROUP BY transaction_type, status
      `, ...params) as any[];

      const result: any = {
        deals: { success: 0, error: 0 },
        withdrawals: { success: 0, error: 0 },
        total: 0,
      };

      for (const stat of stats) {
        const type = stat.transaction_type === "deal" ? "deals" : "withdrawals";
        result[type][stat.status] = parseInt(stat.count);
        result.total += parseInt(stat.count);
      }

      return result;
    } catch (error) {
      await this.logError("Failed to get statistics", { error });
      return {
        deals: { success: 0, error: 0 },
        withdrawals: { success: 0, error: 0 },
        total: 0,
      };
    }
  }

  /**
   * Helper methods
   */
  private async getMerchantByToken(token: string): Promise<Merchant | null> {
    return await db.merchant.findUnique({ where: { token } });
  }

  private async getMerchantById(id: string): Promise<Merchant | null> {
    return await db.merchant.findUnique({ where: { id } });
  }

  private async logEmulatorActivity(log: {
    merchantId: string;
    merchantName: string;
    action: string;
    transactionType: string;
    request: any;
    response: any;
    status: string;
    error?: string;
    batchId?: string;
    batchIndex?: number;
    batchTotal?: number;
  }) {
    try {
      await db.$executeRaw`
        INSERT INTO merchant_emulator_logs (
          merchant_id, merchant_name, action, transaction_type,
          request, response, status, error, batch_id, batch_index, batch_total
        ) VALUES (
          ${log.merchantId}, ${log.merchantName}, ${log.action}, ${log.transactionType},
          ${JSON.stringify(log.request)}, ${JSON.stringify(log.response)}, 
          ${log.status}, ${log.error || null}, ${log.batchId || null}, 
          ${log.batchIndex || null}, ${log.batchTotal || null}
        )
      `;
    } catch (error) {
      await this.logError("Failed to log emulator activity", { error });
    }
  }

  private async updateBatchLog(batchId: string, current: number, total: number) {
    // This is called frequently, so we'll just log progress at intervals
    if (current % 10 === 0 || current === total) {
      await this.logDebug(`Batch progress: ${current}/${total}`, { batchId });
    }
  }
}

// Register service
ServiceRegistry.register("MerchantEmulatorService", MerchantEmulatorService);