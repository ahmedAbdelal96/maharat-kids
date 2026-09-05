import type { OrderStatus, PaymentStatus } from "@prisma/client";

import type { AdminCustomer, CustomerAddress } from "../types";

export type CustomerListPurchaseFilter = "HAS_ORDERS" | "NO_ORDERS";
export type CustomerListValueFilter = "HAS_SPENT" | "NEVER_PURCHASED";
export type CustomerListConsentFilter = "OPTED_IN" | "NOT_OPTED_IN";

export type CustomerListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "PENDING";
  purchase?: CustomerListPurchaseFilter;
  value?: CustomerListValueFilter;
  marketing?: CustomerListConsentFilter;
};

export type AdminCustomerListPage = {
  items: CustomerListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CustomerListItem = AdminCustomer & {
  orderCount: number;
  paidOrderCount: number;
  totalSpent: string;
  lastOrderAt: Date | null;
};

export type CustomerValueMetrics = {
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  totalSpent: string;
  averageOrderValue: string;
  lastOrderAt: Date | null;
};

export type Customer360Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  total: string;
  currency: string;
  createdAt: Date;
};

export type Customer360CartItem = {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  isAvailable: boolean;
};

export type Customer360Cart = {
  items: Customer360CartItem[];
  total: string;
};

export type Customer360Favorite = {
  id: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  price: string;
  status: string;
  isAvailable: boolean;
  createdAt: Date;
};

export type CustomerActivityEvent = {
  id: string;
  type: "REGISTERED" | "LOGIN" | "ORDER" | "PAYMENT" | "STATUS" | "FAVORITE" | "NOTIFICATION";
  title: string;
  description: string;
  createdAt: Date;
  href?: string;
};

export type AdminCustomer360 = {
  profile: CustomerListItem;
  addresses: CustomerAddress[];
  metrics: CustomerValueMetrics;
  orders: Customer360Order[];
  ordersPage: number;
  ordersTotalPages: number;
  cart: Customer360Cart;
  favorites: Customer360Favorite[];
  activity: CustomerActivityEvent[];
  canUpdate: boolean;
};
