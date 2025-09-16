import { Elysia } from "elysia";
import { traderGuard } from "@/middleware/traderGuard";
import { merchantGuard } from "@/middleware/merchantGuard";
import { adminGuard } from "@/middleware/adminGuard";
import { MASTER_KEY, parseAdminIPs } from "@/utils/constants";

interface AuthOptions {
  variant: "trader" | "merchant" | "admin";
}

// Admin IPs configuration (same as in index.ts)
const baseAdminIPs = [
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "95.163.152.102",
  "77.91.84.94",
];

const additionalAdminIPs = parseAdminIPs(Bun.env.ADMIN_IPS);
const ADMIN_IP_WHITELIST = [...baseAdminIPs, ...additionalAdminIPs];

/**
 * Auth plugin that provides role-based authentication
 * @param options - Authentication options with variant specifying the role
 * @returns Elysia instance with appropriate guard middleware
 */
export const authPlugin = (options: AuthOptions) => {
  const app = new Elysia();

  switch (options.variant) {
    case "trader":
      return app.use(traderGuard());
    
    case "merchant":
      return app.use(merchantGuard());
    
    case "admin":
      return app.use(adminGuard(MASTER_KEY, ADMIN_IP_WHITELIST));
    
    default:
      throw new Error(`Unknown auth variant: ${options.variant}`);
  }
};