export type PaymentMethodType = "CASH_ON_DELIVERY" | "MANUAL_TRANSFER" | "ONLINE_GATEWAY";

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
