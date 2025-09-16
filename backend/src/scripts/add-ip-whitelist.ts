import { db } from "../db";

async function addIpToWhitelist(ip: string, description?: string) {
  try {
    const existing = await db.adminIpWhitelist.findUnique({
      where: { ip }
    });

    if (existing) {
      console.log(`IP ${ip} is already whitelisted`);
      return;
    }

    const entry = await db.adminIpWhitelist.create({
      data: {
        ip,
        description: description || `Added via script on ${new Date().toISOString()}`
      }
    });

    console.log(`Successfully added IP ${ip} to whitelist`);
    console.log(entry);
  } catch (error) {
    console.error("Error adding IP to whitelist:", error);
  } finally {
    await db.$disconnect();
  }
}

// Get IP from command line argument
const ip = process.argv[2];
const description = process.argv[3];

if (!ip) {
  console.error("Usage: bun run add-ip-whitelist.ts <IP_ADDRESS> [description]");
  process.exit(1);
}

// Basic IP validation (IPv4 and IPv6)
const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
const ipv6Regex = /^([\da-fA-F]{0,4}:){2,7}[\da-fA-F]{0,4}$|^::1$|^::ffff:[\d.]+$/;
if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
  console.error("Invalid IP address format");
  process.exit(1);
}

addIpToWhitelist(ip, description);