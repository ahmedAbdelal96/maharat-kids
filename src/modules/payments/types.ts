export type PaymentMethodType = "CASH_ON_DELIVERY" | "ONLINE_PAYMENT" | "BANK_TRANSFER" | "MANUAL_TRANSFER" | "ONLINE_GATEWAY";

export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  type: PaymentMethodType;
  enabled: boolean;
  isSystem: boolean;
  destination: string | null;
  instructions: string | null;
  confirmationWhatsApp: string | null;
  providerKey: string | null;
  sortOrder: number;
  market?: "SAUDI_ARABIA" | "EGYPT";
  marketConfigId?: string;
  providerConfigured?: boolean;
  bankAccount?: BankTransferAccount | null;
};

export type BankTransferAccount = {
  id: string;
  market: "SAUDI_ARABIA" | "EGYPT";
  bankNameAr: string;
  bankNameEn: string;
  accountHolderName: string;
  iban: string;
  accountNumber: string | null;
  swiftCode: string | null;
  instructionsAr: string | null;
  instructionsEn: string | null;
};

export type PaymentMethodInput = {
  code?: string;
  name: string;
  type: PaymentMethodType;
  enabled: boolean;
  destination?: string | null;
  instructions?: string | null;
  confirmationWhatsApp?: string | null;
  providerKey?: string | null;
  sortOrder?: number;
};
