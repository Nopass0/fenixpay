import { traderApiInstance } from "./api";

export interface PayoutFilters {
  trafficTypes: string[];
  bankTypes: string[];
  maxPayoutAmount: number;
}

export const filtersApi = {
  // Get saved filters
  async getFilters() {
    const response = await traderApiInstance.get("/trader/filters");
    return response.data as {
      success: boolean;
      filters: PayoutFilters;
    };
  },

  // Save filters
  async saveFilters(filters: PayoutFilters) {
    const response = await traderApiInstance.put("/trader/filters", filters);
    return response.data as {
      success: boolean;
      filters: PayoutFilters;
    };
  },

  // Get available banks by type
  async getBanksList(type?: 'card' | 'sbp') {
    const params = type ? { type } : {};
    const response = await traderApiInstance.get("/trader/banks-list", { params });
    return response.data as {
      success: boolean;
      banks: string[];
    };
  },
};