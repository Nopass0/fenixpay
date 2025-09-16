import { traderApiInstance } from "./api";

export interface Payout {
  id: string;
  numericId: number;
  amount: number;
  amountUsdt: number;
  total: number;
  totalUsdt: number;
  actualTotalUsdt?: number;
  traderFeeOut?: number;
  rate: number;
  wallet: string;
  bank: string;
  isCard: boolean;
  status: "CREATED" | "ACTIVE" | "CHECKING" | "COMPLETED" | "CANCELLED" | "EXPIRED" | "DISPUTED";
  expireAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  confirmedAt?: string | null;
  cancelledAt?: string | null;
  merchantName?: string;
  metadata?: any;
}

export interface PayoutBalance {
  available: number;
  frozen: number;
  total: number;
}

export const payoutApi = {
  // Get list of payouts
  async getPayouts(params?: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await traderApiInstance.get("/trader/payouts", { params });
    return response.data as {
      success: boolean;
      payouts: Payout[];
      total: number;
    };
  },

  // Accept a payout
  async acceptPayout(payoutId: string) {
    const response = await traderApiInstance.post(`/trader/payouts/${payoutId}/accept`);
    return response.data as {
      success: boolean;
      payout: {
        id: string;
        status: string;
        expireAt: string;
      };
    };
  },

  // Confirm payout with proof
  async confirmPayout(payoutId: string, proofFiles: string[]) {
    const response = await traderApiInstance.post(`/trader/payouts/${payoutId}/confirm`, {
      proofFiles,
    });
    return response.data as {
      success: boolean;
      payout: {
        id: string;
        status: string;
      };
    };
  },

  // Cancel payout
  async cancelPayout(payoutId: string, reason: string, reasonCode?: string, files?: string[]) {
    const response = await traderApiInstance.post(`/trader/payouts/${payoutId}/cancel`, {
      reason,
      reasonCode,
      files,
    });
    return response.data as {
      success: boolean;
      payout: {
        id: string;
        status: string;
      };
    };
  },

  // Get payout balance
  async getBalance() {
    const response = await traderApiInstance.get("/trader/payouts/balance");
    return response.data as {
      success: boolean;
      balance: PayoutBalance;
    };
  },

  // Update payout balance
  async updateBalance(balance: number) {
    const response = await traderApiInstance.put("/trader/payouts/balance", { balance });
    return response.data as {
      success: boolean;
      balance: PayoutBalance;
    };
  },

  // Upload proof files
  async uploadProofFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    
    const response = await traderApiInstance.post("/trader/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    return response.data as {
      success: boolean;
      url: string;
    };
  },
  
  // Get payout details
  async getPayoutDetails(payoutId: string) {
    const response = await traderApiInstance.get(`/trader/payouts/${payoutId}`);
    return response.data as {
      success: boolean;
      payout: Payout & {
        disputeFiles?: string[];
        disputeMessage?: string;
        proofFiles?: string[];
        cancelReason?: string;
        cancellationHistory?: Array<{
          id: string;
          reason: string;
          reasonCode?: string | null;
          files: string[];
          createdAt: string;
          trader: {
            id: string;
            name: string;
            email: string;
          };
        }>;
      };
    };
  },
};