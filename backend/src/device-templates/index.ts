import { sberTemplates, sberSpamTemplates } from "./sber.template"
import { tinkTemplates, tinkSpamTemplates } from "./tink.template"

export interface BankTemplate {
  incoming: string[]
  packageName: string
  appName: string
}

export const bankTemplates: Record<string, BankTemplate> = {
  SBER: sberTemplates,
  TINK: tinkTemplates,
  VTB: {
    incoming: [
      "ВТБ | Пополнение на {{amount}} ₽, счет RUB. {{sender}}. Доступно {{balance}} ₽",
      "ВТБ: +{{amount}} RUB. От: {{sender}}. Карта *{{last4}}. Баланс: {{balance}} RUB",
    ],
    packageName: "ru.vtb24.mobilebanking.android",
    appName: "ВТБ Онлайн",
  },
  ALFA: {
    incoming: [
      "Альфа-Банк | Пополнение на {{amount}} ₽, счет RUB. {{sender}}. Доступно {{balance}} ₽",
      "Альфа-Банк. Зачисление {{amount}} р. от {{sender}}. Баланс {{balance}} р.",
    ],
    packageName: "ru.alfabank.mobile.android",
    appName: "Альфа-Банк",
  },
  GAZPROM: {
    incoming: [
      "Газпромбанк | Пополнение на {{amount}} ₽, счет RUB. {{sender}}. Доступно {{balance}} ₽",
      "ГПБ Мобайл: +{{amount}} руб. от {{sender}}. Доступно: {{balance}} руб.",
    ],
    packageName: "ru.gazprombank.android.mobilebank.app",
    appName: "Газпромбанк",
  },
  OZON: {
    incoming: [
      "Озон Банк (Ozon) | Пополнение на {{amount}} ₽, счет RUB. {{sender}}. Доступно {{balance}} ₽",
      "Ozon Банк: перевод +{{amount}} ₽ от {{sender}}. Баланс {{balance}} ₽",
    ],
    packageName: "ru.ozon.app.android",
    appName: "Ozon Банк",
  },
}

export const spamTemplates: Record<string, string[]> = {
  SBER: sberSpamTemplates,
  TINK: tinkSpamTemplates,
  VTB: [
    "ВТБ: Ваша заявка на кредит одобрена! Получите до 3 млн руб",
    "Акция от ВТБ! Кэшбэк 10% на все покупки",
  ],
  ALFA: [
    "Альфа-Банк: срочно подтвердите операцию по ссылке",
    "Выиграйте iPhone 15 Pro от Альфа-Банка!",
  ],
  GAZPROM: [
    "Газпромбанк: обновите приложение для продолжения работы",
    "Специальное предложение по ипотеке от ГПБ",
  ],
  OZON: [
    "Ozon: вам начислено 10000 баллов! Потратьте их сегодня",
    "Озон Банк: оформите карту и получите 2000 ₽",
  ],
}