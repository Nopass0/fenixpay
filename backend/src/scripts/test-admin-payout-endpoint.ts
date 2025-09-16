#!/usr/bin/env bun

import { db } from "../db";

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const ADMIN_KEY = process.env.ADMIN_MASTER_KEY || 'a9b4b713d18df63f120cd5556fdea3acef18990860ed74a69c34daa568c65784';

async function testAdminPayoutEndpoint() {
  try {
    console.log("Testing /admin/payouts/test endpoint...\n");
    
    const response = await fetch(`${API_URL}/admin/payouts/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': ADMIN_KEY
      },
      body: JSON.stringify({
        amount: 25000,
        wallet: '5555666677778888',
        bank: 'Тинькофф',
        direction: 'OUT'
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error(`Error ${response.status}: ${error}`);
      return;
    }
    
    const result = await response.json();
    console.log("Response:", JSON.stringify(result, null, 2));
    
    if (result.success && result.payout) {
      // Wait a bit for distribution
      console.log("\nWaiting 3 seconds for distribution...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if payout was assigned
      const payout = await db.payout.findUnique({
        where: { id: result.payout.id },
        include: { trader: true }
      });
      
      console.log("\nPayout after distribution:");
      console.log(`- Status: ${payout?.status}`);
      console.log(`- Trader: ${payout?.trader?.email || 'NOT ASSIGNED'}`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
}

testAdminPayoutEndpoint();