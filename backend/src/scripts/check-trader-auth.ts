import { db } from "../db";

async function main() {
  console.log("Checking all traders and their devices...");
  
  const traders = await db.user.findMany({
    include: {
      devices: {
        select: {
          id: true,
          name: true,
          token: true,
          isOnline: true,
        }
      }
    },
    where: {
      devices: {
        some: {
          token: { not: null }
        }
      }
    }
  });
  
  console.log("Traders with device tokens:");
  traders.forEach(trader => {
    console.log(`- ${trader.email} (${trader.name || 'no name'})`);
    console.log(`  ID: ${trader.id}`);
    trader.devices.forEach(device => {
      console.log(`  Device: ${device.name}, Token: ${device.token ? device.token.substring(0, 20) + '...' : 'none'}, Online: ${device.isOnline}`);
    });
    console.log("");
  });
  
  // Also check payouts assignments
  console.log("Payout assignments:");
  const payoutAssignments = await db.$queryRaw<Array<{traderId: string, email: string, count: bigint}>>`
    SELECT u.id as "traderId", u.email, COUNT(p.id) as count
    FROM "User" u
    LEFT JOIN "Payout" p ON p."traderId" = u.id
    INNER JOIN "Device" d ON d."userId" = u.id AND d.token IS NOT NULL
    GROUP BY u.id, u.email
    ORDER BY count DESC
  `;
  
  payoutAssignments.forEach(assignment => {
    console.log(`- ${assignment.email}: ${assignment.count} payouts assigned`);
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());