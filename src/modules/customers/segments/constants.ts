import type { CustomerSegmentDefinition, CustomerSegmentKey } from "./types";

export const defaultHighValueThreshold = "5000.00";

export const customerSegmentDefinitions: CustomerSegmentDefinition[] = [
  { key: "all", name: "All Customers", description: "Every customer account in this store." },
  { key: "marketing_opted_in", name: "Marketing Opted In", description: "Customers who explicitly agreed to receive offers and updates.", marketingReady: true },
  { key: "never_purchased", name: "Never Purchased", description: "Customers with no completed paid purchase." },
  { key: "purchased", name: "Purchased Customers", description: "Customers with at least one completed paid purchase." },
  { key: "repeat", name: "Repeat Customers", description: "Customers with at least two completed paid purchases." },
  { key: "high_value", name: "High-Value Customers", description: "Customers whose completed paid spend meets the selected threshold." },
  { key: "active_cart", name: "Active Carts", description: "Customers with products currently saved in an active cart." },
  { key: "favorites_without_purchase", name: "Favorites Without Purchase", description: "Customers with saved favorites but no completed paid purchase." },
  { key: "inactive", name: "Inactive Customers", description: "Customers inactive for the selected number of days. Never-logged-in customers use registration time." },
  { key: "recently_registered", name: "Recently Registered", description: "Customers who registered within the selected number of days." },
];

export function getCustomerSegmentDefinition(key: CustomerSegmentKey) {
  return customerSegmentDefinitions.find((definition) => definition.key === key) ?? customerSegmentDefinitions[0];
}
