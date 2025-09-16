import { db } from '../src/db';
import { PayoutService } from '../src/services/payout.service';

console.log('🧪 Тестирование эмулятора выплат...\n');

async function testPayoutEmulator() {
  try {
    // Находим созданного мерчанта
    const merchant = await db.merchant.findUnique({
      where: { token: 'test-payout-merchant' }
    });

    if (!merchant) {
      console.log('❌ Мерчант не найден');
      return;
    }

    console.log('✅ Мерчант найден:', merchant.name);

    // Создаем тестовую выплату
    const payoutService = PayoutService.getInstance();
    
    const testPayout = await payoutService.createPayout({
      merchantId: merchant.id,
      amount: 5000,
      wallet: '+79001234567',
      bank: 'Сбербанк СБП',
      isCard: false,
      rate: 98.5,
      processingTime: 15,
      webhookUrl: 'http://localhost:3000/webhook/test',
      metadata: {
        testPayout: true,
        createdBy: 'test-script',
      }
    });

    console.log('✅ Тестовая выплата создана:');
    console.log('ID:', testPayout.id);
    console.log('Номер:', testPayout.numericId);
    console.log('Сумма:', testPayout.amount, '₽');
    console.log('Кошелек:', testPayout.wallet);
    console.log('Банк:', testPayout.bank);
    console.log('Статус:', testPayout.status);

    // Проверяем список выплат для трейдера
    const trader = await db.user.findUnique({
      where: { email: 'payout-trader@test.com' }
    });

    if (trader) {
      console.log('\n✅ Трейдер найден:', trader.name);
      console.log('ID:', trader.id);
      console.log('Email:', trader.email);
      console.log('Баланс выплат:', trader.payoutBalance, '₽');
      console.log('Замороженный баланс:', trader.frozenPayoutBalance, '₽');

      // Получаем выплаты для трейдера
      const { payouts } = await payoutService.getTraderPayouts(trader.id, {
        limit: 10
      });

      console.log('\n📋 Доступные выплаты для трейдера:');
      payouts.forEach((payout) => {
        console.log(`- #${payout.numericId}: ${payout.amount}₽ - ${payout.status} - ${payout.wallet}`);
      });

      // Попробуем принять выплату
      if (payouts.length > 0) {
        const firstPayout = payouts[0];
        try {
          const acceptedPayout = await payoutService.acceptPayout(firstPayout.id, trader.id);
          console.log('\n✅ Выплата принята трейдером:');
          console.log('ID:', acceptedPayout.id);
          console.log('Статус:', acceptedPayout.status);
          console.log('Время принятия:', acceptedPayout.acceptedAt);
        } catch (error) {
          console.log('\n⚠️  Ошибка при принятии выплаты:', error.message);
        }
      }
    }

    console.log('\n🎉 Тест завершен успешно!');
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании:', error);
  }
}

testPayoutEmulator()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));