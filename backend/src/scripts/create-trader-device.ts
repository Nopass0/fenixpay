import { db } from "../db";
import { randomUUID } from "crypto";

async function main() {
  const traderEmail = process.argv[2] || "trader@test.com";
  
  console.log(`Creating device for trader: ${traderEmail}`);
  
  const trader = await db.user.findUnique({
    where: { email: traderEmail },
    include: { devices: true }
  });
  
  if (!trader) {
    console.error("Trader not found");
    process.exit(1);
  }
  
  console.log(`Found trader: ${trader.email} (ID: ${trader.id})`);
  console.log(`Existing devices: ${trader.devices.length}`);
  
  if (trader.devices.length > 0) {
    console.log("Existing devices:");
    trader.devices.forEach(device => {
      console.log(`  - ${device.name}: token=${device.token ? 'has token' : 'no token'}, online=${device.isOnline}`);
    });
  }
  
  // Create a new device with token
  const deviceToken = randomUUID();
  const device = await db.device.create({
    data: {
      name: "Test Device",
      token: deviceToken,
      isOnline: true,
      isWorking: true,
      userId: trader.id,
      energy: 100,
      ethernetSpeed: 100,
      emulated: true,
      lastActiveAt: new Date(),
      firstConnectionAt: new Date(),
    }
  });
  
  console.log("\nCreated device:");
  console.log(`  Name: ${device.name}`);
  console.log(`  ID: ${device.id}`);
  console.log(`  Token: ${device.token}`);
  console.log(`  Online: ${device.isOnline}`);
  
  console.log("\nNow the trader can authenticate using this device token.");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());