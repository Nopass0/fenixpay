import { Elysia } from "elysia";
import { ip } from "elysia-ip";

export const getMyIpRoute = new Elysia()
  .use(ip())
  .get("/api/get-my-ip", ({ ip: clientIp }) => {
    console.log(`[GetMyIP] Client IP: ${clientIp}`);
    return { 
      ip: clientIp,
      message: `Your IP is: ${clientIp}`,
      command: `bun run src/scripts/add-ip-whitelist.ts "${clientIp}" "My IP"`
    };
  });