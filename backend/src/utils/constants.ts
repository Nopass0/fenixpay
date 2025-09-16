import { randomBytes } from "node:crypto";

// Dynamic admin key for the session (ensure ASCII-only characters)
export const ADMIN_KEY = randomBytes(32).toString("hex");

// Master key from environment or use dynamic key as fallback
export const MASTER_KEY = Bun.env.SUPER_ADMIN_KEY || ADMIN_KEY;

// Parse additional admin IPs from environment variable
export const parseAdminIPs = (envVar?: string): string[] => {
  if (!envVar) return [];
  return envVar.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
};
