import { BaseService } from "./BaseService";
import { db } from "../db";
import { PayoutService } from "./payout.service";

interface PayoutEmulatorConfig {
  enabled: boolean;
  merchantId?: string;
  minAmount: number;
  maxAmount: number;
  minRate: number;
  maxRate: number;
  banks: string[];
  cardRatio: number; // 0-1 ratio of card vs SBP payments
  intervalMs: number;
  webhookUrl?: string;
}

export default class PayoutEmulatorService extends BaseService {
  protected interval = 30_000; // 30 seconds
  
  private config: PayoutEmulatorConfig = {
    enabled: false,
    minAmount: 1000,
    maxAmount: 50000,
    minRate: 95,
    maxRate: 105,
    banks: ["Сбербанк", "Тинькофф", "ВТБ", "Альфа-банк", "Райффайзен"],
    cardRatio: 0.5,
    intervalMs: 30000,
  };
  
  private payoutService: PayoutService;
  
  
  protected async onStart(): Promise<void> {
    // Load config from database
    const savedConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "payout_emulator" },
    });
    
    if (savedConfig?.config) {
      this.config = { ...this.config, ...(savedConfig.config as any) };
    }
  }
  
  protected async onStop(): Promise<void> {
    // Nothing specific to do on stop
  }
  
  protected async tick(): Promise<void> {
    // Reload config from database
    const savedConfig = await db.serviceConfig.findUnique({
      where: { serviceKey: "payout_emulator" },
    });
    
    if (savedConfig?.config) {
      this.config = { ...this.config, ...(savedConfig.config as any) };
    }
    
    if (!this.config.enabled) {
      return;
    }
    
    try {
      // Get a random merchant or use configured one
      let merchantId = this.config.merchantId;
      
      if (!merchantId) {
        const merchants = await db.merchant.findMany({
          where: { banned: false, disabled: false },
          select: { id: true },
        });
        
        if (merchants.length === 0) {
          await this.logWarn("No active merchants found");
          return;
        }
        
        merchantId = merchants[Math.floor(Math.random() * merchants.length)].id;
      }
      
      // Generate random payout data
      const amount = Math.floor(
        Math.random() * (this.config.maxAmount - this.config.minAmount) + 
        this.config.minAmount
      );
      
      const rate = 
        Math.random() * (this.config.maxRate - this.config.minRate) + 
        this.config.minRate;
      
      const isCard = Math.random() < this.config.cardRatio;
      const bank = this.config.banks[
        Math.floor(Math.random() * this.config.banks.length)
      ];
      
      let wallet: string;
      if (isCard) {
        // Generate fake card number
        const cardPrefix = ["5469", "4276", "2200", "5536"][
          Math.floor(Math.random() * 4)
        ];
        wallet = `${cardPrefix} ${Math.floor(Math.random() * 9000 + 1000)} ${
          Math.floor(Math.random() * 9000 + 1000)
        } ${Math.floor(Math.random() * 9000 + 1000)}`;
      } else {
        // Generate fake phone number
        wallet = `7${Math.floor(Math.random() * 9000000000 + 1000000000)}`;
      }
      
      // Create payout
      const payout = await this.payoutService.createPayout({
        merchantId,
        amount,
        wallet,
        bank,
        isCard,
        rate,
        processingTime: 15,
        webhookUrl: this.config.webhookUrl,
        metadata: {
          source: "emulator",
          timestamp: new Date().toISOString(),
        },
      });
      
      await this.logInfo(`Created emulated payout #${payout.numericId}`, {
        amount,
        wallet: wallet.substring(0, 4) + "****",
        bank,
        isCard,
      });
    } catch (error) {
      await this.logError("Failed to create emulated payout", { error });
    }
  }
  
  protected getPublicFields() {
    return {
      config: this.config,
      stats: {
        lastRun: this.lastTick,
      },
    };
  }
  
  constructor() {
    super({
      displayName: "Payout Emulator",
      description: "Emulates merchant payout requests for testing",
      enabled: false,
      autoStart: false,
      tags: ["payout", "emulator", "testing"],
    });
    this.payoutService = PayoutService.getInstance();
    
    // Add endpoints
    this.addEndpoint({
      path: "/config",
      method: "GET",
      handler: async () => {
        return { config: this.config };
      },
      description: "Get current emulator configuration",
    });
    
    this.addEndpoint({
      path: "/config",
      method: "PUT",
      handler: async ({ body }: { body: Partial<PayoutEmulatorConfig> }) => {
        this.config = { ...this.config, ...body };
        
        // Save to database
        await db.serviceConfig.upsert({
          where: { serviceKey: "payout_emulator" },
          create: {
            serviceKey: "payout_emulator",
            config: this.config as any,
          },
          update: {
            config: this.config as any,
          },
        });
        
        await this.logInfo("Configuration updated", { config: this.config });
        
        return { success: true, config: this.config };
      },
      description: "Update emulator configuration",
    });
    
    this.addEndpoint({
      path: "/trigger",
      method: "POST",
      handler: async () => {
        // Reload config from database
        const savedConfig = await db.serviceConfig.findUnique({
          where: { serviceKey: "payout_emulator" },
        });
        
        if (savedConfig?.config) {
          this.config = { ...this.config, ...(savedConfig.config as any) };
        }
        
        if (!this.config.enabled) {
          return { error: "Emulator is disabled" };
        }
        
        await this.tick();
        return { success: true, message: "Payout generation triggered" };
      },
      description: "Manually trigger payout generation",
    });
  }
  
}