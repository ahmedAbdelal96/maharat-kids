export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type StoreSetting = {
  id: string;
  key: string;
  value: JsonValue;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateSettingInput = {
  key: string;
  value: JsonValue;
};

export type BulkUpdateSettingsInput = UpdateSettingInput[];

export type StoreSettings = {
  name: string;
  email: string;
  phone: string;
  currency: string;
  language: string;
  seoTitle: string;
  seoDescription: string;
  googleEnabled: boolean;
  maxActiveOffers: number;
  maxHeroOffers: number;
  returnsEnabled: boolean;
  returnsWindowDays: number;
  returnsPolicyText: string;
};
