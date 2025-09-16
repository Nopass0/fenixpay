// Deposit-related types for frontend

export enum DepositType {
  BALANCE = 'BALANCE',
  INSURANCE = 'INSURANCE'
}

export enum DepositStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED'
}

export interface DepositRequest {
  id: string;
  traderId: string;
  amountUSDT: number;
  address: string;
  status: DepositStatus;
  txHash: string | null;
  confirmations: number;
  type: DepositType;
  createdAt: string;
  confirmedAt: string | null;
  processedAt?: string | null;
}

export interface DepositSettings {
  address: string;
  minAmount: number;
  confirmationsRequired: number;
  expiryMinutes: number;
  network: string;
}