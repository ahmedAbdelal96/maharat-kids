import type { CustomerListItem } from "../intelligence/types";

export const customerSegmentKeys = [
  "all",
  "marketing_opted_in",
  "never_purchased",
  "purchased",
  "repeat",
  "high_value",
  "active_cart",
  "favorites_without_purchase",
  "inactive",
  "recently_registered",
] as const;

export type CustomerSegmentKey = (typeof customerSegmentKeys)[number];
export type CustomerSegmentSort = "newest" | "oldest" | "highest_spent" | "lowest_spent" | "most_orders" | "recent_login";
export type CustomerSegmentConsent = "OPTED_IN" | "NOT_OPTED_IN";

export type CustomerSegmentQuery = {
  segment: CustomerSegmentKey;
  page?: number;
  pageSize?: number;
  search?: string;
  consent?: CustomerSegmentConsent;
  registeredDays?: number;
  lastLoginDays?: number;
  minSpend?: string;
  maxSpend?: string;
  minOrders?: number;
  maxOrders?: number;
  highValueThreshold?: string;
  inactiveDays?: number;
  sort?: CustomerSegmentSort;
};

export type CustomerSegmentDefinition = {
  key: CustomerSegmentKey;
  name: string;
  description: string;
  marketingReady?: boolean;
};

export type CustomerSegmentRow = CustomerListItem & {
  cartItemCount: number;
  cartValue: string;
  favoritesCount: number;
};

export type CustomerSegmentSummary = {
  totalCustomers: number;
  totalSpend: string;
  optedIn: number;
  averageCustomerSpend: string;
};

export type CustomerSegmentPage = {
  definition: CustomerSegmentDefinition;
  definitions: Array<CustomerSegmentDefinition & { count: number }>;
  items: CustomerSegmentRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: CustomerSegmentSummary;
  canExport: boolean;
};
