import { PayoutService } from "../services/payout.service";

async function main() {
  const payoutService = PayoutService.getInstance();
  const traderId = "cmdggji8v0001ik87u2pkgo63"; // trader@test.com
  
  console.log("Testing different status filters...\n");
  
  // Test different status filters
  const statusTests = [
    { name: "Active tab", status: ["ACTIVE", "CREATED"] },
    { name: "Check tab", status: ["CHECKING"] },
    { name: "History tab", status: ["COMPLETED"] },
    { name: "Cancelled tab", status: ["CANCELLED"] },
    { name: "All tab", status: undefined },
  ];
  
  for (const test of statusTests) {
    console.log(`=== ${test.name} ===`);
    console.log(`Status filter: ${test.status ? test.status.join(", ") : "none"}`);
    
    const result = await payoutService.getTraderPayouts(traderId, {
      status: test.status as any,
      limit: 20,
      offset: 0,
    });
    
    console.log(`Found ${result.payouts.length} payouts (total: ${result.total})`);
    if (result.payouts.length > 0) {
      result.payouts.forEach(p => {
        console.log(`  - ID ${p.numericId}: ${p.status}, trader: ${p.traderId ? 'assigned' : 'pool'}, ${p.amount} RUB`);
      });
    }
    console.log("");
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));