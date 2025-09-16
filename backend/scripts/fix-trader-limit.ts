import { db } from '../src/db';

async function updateTraderLimit() {
  const trader = await db.user.findFirst({
    where: { email: 'payout-trader@test.com' }
  });
  
  if (trader) {
    const updated = await db.user.update({
      where: { id: trader.id },
      data: { maxSimultaneousPayouts: 50 } // Увеличиваем лимит до 50
    });
    console.log('✅ Лимит выплат увеличен до 50');
    console.log('📧 Трейдер:', trader.email);
    console.log('🔢 Новый лимит:', updated.maxSimultaneousPayouts);
  } else {
    console.log('❌ Трейдер не найден');
  }
  
  process.exit(0);
}

updateTraderLimit().catch(console.error);