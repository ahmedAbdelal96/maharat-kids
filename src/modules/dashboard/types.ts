export type DashboardKpis = {
  revenue: {
    total: string;
    today: string;
    month: string;
    settledCod: string;
  };
  orders: {
    total: number;
    pending: number;
    processing: number;
    delivered: number;
  };
  customers: {
    total: number;
    recent: number;
  };
  products: {
    active: number;
    lowStock: number;
  };
};

export type DashboardRecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  total: string;
  currency: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
};

export type DashboardSalesPoint = {
  date: string;
  label: string;
  revenue: string;
};

export type DashboardTopProduct = {
  productId: string;
  name: string;
  imageUrl: string | null;
  quantitySold: number;
  revenue: string;
  currency: string;
};

export type DashboardLowStockProduct = {
  id: string;
  name: string;
  sku: string | null;
  stockQuantity: number;
  imageUrl: string | null;
};

export type DashboardPendingActions = {
  pendingConfirmation: number;
  unpaidManualTransfers: number;
  pendingVerification: number;
  pendingCodSettlements: number;
  outForDelivery: number;
  lowStockProducts: number;
  withCarriers: number;
  codDueFromCarriers: string;
  returnsWithCarriers: number;
};

export type DashboardData = {
  currency: string;
  kpis: DashboardKpis;
  recentOrders: DashboardRecentOrder[];
  pendingActions: DashboardPendingActions;
  sales: DashboardSalesPoint[];
  topProducts: DashboardTopProduct[];
  lowStockProducts: DashboardLowStockProduct[];
};
