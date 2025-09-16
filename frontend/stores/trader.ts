import { create } from 'zustand'

interface TraderFinancials {
  trustBalance: number
  profitFromDeals: number
  profitFromPayouts: number
  frozenUsdt: number
  frozenRub: number
  balanceUsdt: number
  balanceRub: number
  deposit: number
  escrowBalance: number
  compensationBalance: number
  referralBalance: number
  disputedBalance: number
}

interface TraderStore {
  financials: TraderFinancials | null
  setFinancials: (financials: TraderFinancials) => void
  resetFinancials: () => void
  refreshFinancials: () => Promise<void>
}

export const useTraderStore = create<TraderStore>((set, get) => ({
  financials: null,
  setFinancials: (financials) => set({ financials }),
  resetFinancials: () => set({ financials: null }),
  refreshFinancials: async () => {
    // This will be called to trigger a refresh
    // The actual fetching will be handled by the hook
  },
}))