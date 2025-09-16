#!/usr/bin/env bun

import { db } from "../db";
import { ServiceRegistry } from "../services/ServiceRegistry";

async function checkServices() {
  try {
    // Check services in database
    console.log("=== Services in Database ===");
    const dbServices = await db.service.findMany();
    
    for (const service of dbServices) {
      console.log(`\n${service.name}:`);
      console.log(`  Enabled: ${service.enabled}`);
      console.log(`  Status: ${service.status}`);
      console.log(`  Last Active: ${service.lastActiveAt}`);
    }
    
    // Check if PayoutMonitorService is registered
    console.log("\n=== Registry Check ===");
    try {
      const payoutMonitor = ServiceRegistry.getInstance().get("PayoutMonitorService");
      console.log("PayoutMonitorService is registered:", !!payoutMonitor);
    } catch (error) {
      console.log("PayoutMonitorService is NOT registered");
    }
    
    // Check if any service exists for PayoutMonitor
    const payoutMonitorDb = await db.service.findUnique({
      where: { name: "PayoutMonitorService" }
    });
    
    if (!payoutMonitorDb) {
      console.log("\nPayoutMonitorService not found in database. Creating...");
      await db.service.create({
        data: {
          name: "PayoutMonitorService",
          enabled: true,
          status: "STOPPED",
          config: {},
          version: "1.0.0"
        }
      });
      console.log("Created PayoutMonitorService in database with enabled=true");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

checkServices();