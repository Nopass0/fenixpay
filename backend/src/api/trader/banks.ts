import Elysia, { t } from "elysia";
import { BankType } from "@prisma/client";

// Map BankType enum to display names
const bankDisplayNames: Record<BankType, string> = {
  SBERBANK: "Сбербанк",
  RAIFFEISEN: "Райффайзен",
  GAZPROMBANK: "Газпромбанк",
  POCHTABANK: "Почта Банк",
  VTB: "ВТБ",
  ROSSELKHOZBANK: "Россельхозбанк",
  ALFABANK: "Альфа-банк",
  URALSIB: "Уралсиб",
  LOKOBANK: "Локо-Банк",
  AKBARS: "Ак Барс",
  MKB: "МКБ",
  SPBBANK: "Банк Санкт-Петербург",
  MTSBANK: "МТС Банк",
  PROMSVYAZBANK: "Промсвязьбанк",
  OZONBANK: "Озон Банк",
  OTKRITIE: "Открытие",
  RENAISSANCE: "Ренессанс",
  OTPBANK: "ОТП Банк",
  AVANGARD: "Авангард",
  VLADBUSINESSBANK: "Владбизнесбанк",
  TAVRICHESKIY: "Таврический",
  FORABANK: "Фора-Банк",
  BCSBANK: "БКС Банк",
  HOMECREDIT: "Хоум Кредит",
  BBRBANK: "ББР Банк",
  CREDITEUROPE: "Кредит Европа Банк",
  RNKB: "РНКБ",
  UBRIR: "УБРиР",
  GENBANK: "Генбанк",
  SINARA: "Синара",
  ABSOLUTBANK: "Абсолют Банк",
  MTSMONEY: "МТС Деньги",
  SVOYBANK: "Свой Банк",
  TRANSKAPITALBANK: "ТрансКапиталБанк",
  DOLINSK: "Долинск",
  TBANK: "Т-Банк",
  SOVCOMBANK: "Совкомбанк",
  ROSBANK: "Росбанк",
  UNICREDIT: "ЮниКредит",
  CITIBANK: "Ситибанк",
  RUSSIANSTANDARD: "Русский Стандарт",
};

// Bank logos/icons (could be expanded with actual icon URLs)
const bankIcons: Partial<Record<BankType, string>> = {
  SBERBANK: "💚",
  VTB: "💙",
  ALFABANK: "🔴",
  TBANK: "💛",
  GAZPROMBANK: "🔵",
  // Add more icons as needed
};

export const banksApi = new Elysia({ prefix: "/banks" })
  // Get all available banks
  .get("/", async () => {
    // Get all bank types from the enum
    const banks = Object.entries(BankType).map(([key, value]) => ({
      code: value,
      name: bankDisplayNames[value as BankType] || value,
      icon: bankIcons[value as BankType] || "🏦",
      // You could add more metadata here like:
      // - supported payment methods
      // - processing times
      // - limits
      // - fees
    }));

    return {
      success: true,
      banks: banks.sort((a, b) => a.name.localeCompare(b.name, "ru")),
    };
  })
  
  // Get popular/recommended banks
  .get("/popular", async () => {
    const popularBanks = [
      BankType.SBERBANK,
      BankType.VTB,
      BankType.ALFABANK,
      BankType.TBANK,
      BankType.GAZPROMBANK,
      BankType.RAIFFEISEN,
    ];

    const banks = popularBanks.map((bankType) => ({
      code: bankType,
      name: bankDisplayNames[bankType],
      icon: bankIcons[bankType] || "🏦",
    }));

    return {
      success: true,
      banks,
    };
  });