import type { DeliveryFailureReason, ShipmentStatus } from "@prisma/client";

export type ShippingCompany = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  nameEn: string | null;
  phone: string | null;
  contactPerson: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShippingMarketConfig = { market: "SAUDI_ARABIA" | "EGYPT"; enabled: boolean; isCheckoutCarrier: boolean; rate: string };
export type ShippingCarrierConfiguration = ShippingCompany & { markets: ShippingMarketConfig[] };

export type ShipmentSummary = {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  total: string;
  currency: string;
  paymentStatus: string;
  paymentMethodName: string;
  shippingCompanyId: string | null;
  shippingCompanyName: string | null;
  trackingNumber: string | null;
  status: ShipmentStatus;
  failureReason: DeliveryFailureReason | null;
  failureNote: string | null;
  updatedAt: string;
};

export type ShipmentHistoryEntry = {
  id: string;
  oldStatus: ShipmentStatus | null;
  newStatus: ShipmentStatus;
  changedByUserId: string;
  changedByName: string | null;
  changedByEmail: string | null;
  note: string | null;
  createdAt: string;
};

export type ShipmentDetails = ShipmentSummary & {
  handedToCarrierAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  returnStartedAt: string | null;
  returnedToStoreAt: string | null;
  inventoryRestoredAt: string | null;
  history: ShipmentHistoryEntry[];
};

export type ShippingCompanyMetrics = ShippingCompany & {
  withCarrier: number;
  outForDelivery: number;
  delivered: number;
  failed: number;
  returnsPending: number;
  codDue: string;
};

export type ShippingOverview = {
  totals: {
    companies: number;
    withCarrier: number;
    codDue: string;
    returnsPending: number;
    deliveredToday: number;
  };
  companies: ShippingCompanyMetrics[];
  configurations: ShippingCarrierConfiguration[];
};

export type CodDueItem = {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  total: string;
  currency: string;
  settlementId: string;
  amount: string;
  deliveredAt: string | null;
};

export type SettlementSummary = {
  id: string;
  reference: string | null;
  expectedAmount: string;
  receivedAmount: string;
  difference: string;
  receivedAt: string;
  note: string | null;
  createdByName: string | null;
  createdByEmail: string | null;
  orderCount: number;
};

export type ShippingCompanyDetail = {
  company: ShippingCompany;
  metrics: { withCarrier: number; outForDelivery: number; delivered: number; failed: number; returnsPending: number; codDue: string };
  shipments: ShipmentSummary[];
  shipmentTotal: number;
  codDue: CodDueItem[];
  codDueTotal: string;
  returns: ShipmentSummary[];
  settlements: SettlementSummary[];
};

export type ShippingCompanyDetailQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ShipmentStatus;
};
