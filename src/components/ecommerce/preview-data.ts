/**
 * Generic, domain-agnostic preview data fixtures for presentation components.
 * All mock records are centralized here and isolated from route logic.
 */

import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";

export interface PreviewProduct {
  id: string;
  name: string;
  slug: string;
  category: string;
  categorySlug: string;
  priceInCents: number;
  originalPriceInCents?: number;
  rating: number;
  reviewCount: number;
  image: string;
  description: string;
  isNew?: boolean;
  isFeatured?: boolean;
  inStock: boolean;
  stockCount: number;
  tags: string[];
}

export interface PreviewCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  itemCount: number;
  image: string;
}

export interface PreviewCustomerOrder {
  id: string;
  date: Date;
  status: "Processing" | "Delivered" | "Cancelled";
  totalInCents: number;
  itemCount: number;
  items: string[];
}

export interface PreviewCustomerProfile {
  name: string;
  email: string;
  phone: string;
  memberSince: string;
  status: string;
  address: {
    label: string;
    street: string;
    cityStateZip: string;
    country: string;
  };
}

export interface PreviewAdminOrder {
  id: string;
  customer: string;
  email: string;
  items: number;
  totalInCents: number;
  fulfillmentStatus: "Unfulfilled" | "Processing" | "Fulfilled" | "Cancelled";
  paymentStatus: "Paid" | "Refunded" | "Pending";
  date: Date;
}

export interface PreviewAdminCustomer {
  id: string;
  name: string;
  email: string;
  ordersCount: number;
  totalSpendInCents: number;
  status: string;
  lastActive: Date;
}

export interface PreviewKpiMetric {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: typeof DollarSign;
  description: string;
}

export const PREVIEW_CATEGORIES: PreviewCategory[] = [
  {
    id: "cat-1",
    name: "Featured Collection",
    slug: "featured",
    description: "Curated selection of our best-selling items",
    itemCount: 24,
    image: "/placeholders/category-placeholder.svg",
  },
  {
    id: "cat-2",
    name: "New Arrivals",
    slug: "new-arrivals",
    description: "The latest additions to our store catalog",
    itemCount: 18,
    image: "/placeholders/category-placeholder.svg",
  },
  {
    id: "cat-3",
    name: "Essentials",
    slug: "essentials",
    description: "Everyday items designed for reliability and quality",
    itemCount: 36,
    image: "/placeholders/category-placeholder.svg",
  },
  {
    id: "cat-4",
    name: "Special Releases",
    slug: "special-releases",
    description: "Seasonal pieces and dedicated collections",
    itemCount: 12,
    image: "/placeholders/category-placeholder.svg",
  },
];

export const PREVIEW_PRODUCTS: PreviewProduct[] = [
  {
    id: "prod-1",
    name: "Standard Edition Item 01",
    slug: "standard-edition-item-01",
    category: "Featured Collection",
    categorySlug: "featured",
    priceInCents: 12900,
    originalPriceInCents: 15900,
    rating: 4.9,
    reviewCount: 64,
    image: "/placeholders/product-placeholder.svg",
    description: "Premium build quality and durable finish, crafted for everyday use.",
    isNew: true,
    isFeatured: true,
    inStock: true,
    stockCount: 45,
    tags: ["Featured", "Core"],
  },
  {
    id: "prod-2",
    name: "Classic Minimalist Unit 02",
    slug: "classic-minimalist-unit-02",
    category: "Essentials",
    categorySlug: "essentials",
    priceInCents: 18900,
    rating: 4.8,
    reviewCount: 42,
    image: "/placeholders/product-placeholder.svg",
    description: "Precision engineered piece with refined ergonomics and sleek aesthetic.",
    isFeatured: true,
    inStock: true,
    stockCount: 18,
    tags: ["Essentials", "Core"],
  },
  {
    id: "prod-3",
    name: "Precision Crafted Piece 03",
    slug: "precision-crafted-piece-03",
    category: "New Arrivals",
    categorySlug: "new-arrivals",
    priceInCents: 8500,
    originalPriceInCents: 11000,
    rating: 4.9,
    reviewCount: 88,
    image: "/placeholders/product-placeholder.svg",
    description: "Designed for longevity with high-grade components and attention to detail.",
    isNew: true,
    isFeatured: true,
    inStock: true,
    stockCount: 30,
    tags: ["New", "Crafted"],
  },
  {
    id: "prod-4",
    name: "Studio Reference Model 04",
    slug: "studio-reference-model-04",
    category: "Special Releases",
    categorySlug: "special-releases",
    priceInCents: 14500,
    rating: 4.7,
    reviewCount: 31,
    image: "/placeholders/product-placeholder.svg",
    description: "Refined materials combined with balanced proportions and robust structure.",
    isFeatured: true,
    inStock: true,
    stockCount: 12,
    tags: ["Studio", "Special"],
  },
  {
    id: "prod-5",
    name: "Modular Utility Pack 05",
    slug: "modular-utility-pack-05",
    category: "Essentials",
    categorySlug: "essentials",
    priceInCents: 21000,
    originalPriceInCents: 24000,
    rating: 4.6,
    reviewCount: 52,
    image: "/placeholders/product-placeholder.svg",
    description: "Versatile modular build supporting seamless daily workflows and transit.",
    inStock: true,
    stockCount: 22,
    tags: ["Modular", "Utility"],
  },
  {
    id: "prod-6",
    name: "Signature Collection Item 06",
    slug: "signature-collection-item-06",
    category: "Featured Collection",
    categorySlug: "featured",
    priceInCents: 32000,
    rating: 5.0,
    reviewCount: 19,
    image: "/placeholders/product-placeholder.svg",
    description: "Flagship release engineered without compromise for demanding requirements.",
    inStock: false,
    stockCount: 0,
    tags: ["Signature", "Core"],
  },
];

export const PREVIEW_CUSTOMER_ORDERS: PreviewCustomerOrder[] = [
  {
    id: "ORD-8492",
    date: new Date("2026-08-20T14:30:00.000Z"),
    status: "Delivered",
    totalInCents: 24900,
    itemCount: 2,
    items: ["Standard Edition Item 01", "Precision Crafted Piece 03"],
  },
  {
    id: "ORD-7120",
    date: new Date("2026-07-28T10:15:00.000Z"),
    status: "Processing",
    totalInCents: 18900,
    itemCount: 1,
    items: ["Classic Minimalist Unit 02"],
  },
];

export const PREVIEW_CUSTOMER_PROFILE: PreviewCustomerProfile = {
  name: "Sample Customer",
  email: "customer@example.com",
  phone: "+1 (555) 019-2834",
  memberSince: "2025",
  status: "Active Customer",
  address: {
    label: "Main Shipping Address",
    street: "123 Market Street, Suite 100",
    cityStateZip: "San Francisco, CA 94105",
    country: "United States",
  },
};

export const PREVIEW_KPI_METRICS: PreviewKpiMetric[] = [
  {
    title: "Total Revenue",
    value: "$128,450.00",
    change: "+14.2%",
    isPositive: true,
    icon: DollarSign,
    description: "vs. last month",
  },
  {
    title: "Total Orders",
    value: "1,429",
    change: "+8.4%",
    isPositive: true,
    icon: ShoppingCart,
    description: "vs. last month",
  },
  {
    title: "Conversion Rate",
    value: "3.84%",
    change: "+0.6%",
    isPositive: true,
    icon: TrendingUp,
    description: "vs. last month",
  },
  {
    title: "Active Customers",
    value: "3,892",
    change: "+12.1%",
    isPositive: true,
    icon: Users,
    description: "vs. last month",
  },
];

export const PREVIEW_ADMIN_ORDERS: PreviewAdminOrder[] = [
  {
    id: "ORD-9281",
    customer: "Alexander Wright",
    email: "alex.wright@example.com",
    items: 2,
    totalInCents: 38900,
    fulfillmentStatus: "Fulfilled",
    paymentStatus: "Paid",
    date: new Date("2026-08-24T12:00:00.000Z"),
  },
  {
    id: "ORD-9280",
    customer: "Elena Rostova",
    email: "elena.r@example.com",
    items: 1,
    totalInCents: 29900,
    fulfillmentStatus: "Processing",
    paymentStatus: "Paid",
    date: new Date("2026-08-24T10:00:00.000Z"),
  },
  {
    id: "ORD-9279",
    customer: "Marcus Chen",
    email: "marcus.chen@example.com",
    items: 3,
    totalInCents: 18500,
    fulfillmentStatus: "Unfulfilled",
    paymentStatus: "Paid",
    date: new Date("2026-08-24T07:00:00.000Z"),
  },
  {
    id: "ORD-9278",
    customer: "Sarah Jenkins",
    email: "s.jenkins@example.com",
    items: 1,
    totalInCents: 50900,
    fulfillmentStatus: "Fulfilled",
    paymentStatus: "Paid",
    date: new Date("2026-08-23T18:00:00.000Z"),
  },
  {
    id: "ORD-9277",
    customer: "David Kim",
    email: "david.kim@example.com",
    items: 1,
    totalInCents: 14500,
    fulfillmentStatus: "Cancelled",
    paymentStatus: "Refunded",
    date: new Date("2026-08-23T12:00:00.000Z"),
  },
];

export const PREVIEW_ADMIN_CUSTOMERS: PreviewAdminCustomer[] = [
  {
    id: "CUST-101",
    name: "Alexander Wright",
    email: "alex.wright@example.com",
    ordersCount: 8,
    totalSpendInCents: 245000,
    status: "Active",
    lastActive: new Date("2026-08-22T15:00:00.000Z"),
  },
  {
    id: "CUST-102",
    name: "Elena Rostova",
    email: "elena.r@example.com",
    ordersCount: 4,
    totalSpendInCents: 119600,
    status: "Active",
    lastActive: new Date("2026-08-20T11:00:00.000Z"),
  },
  {
    id: "CUST-103",
    name: "Marcus Chen",
    email: "marcus.chen@example.com",
    ordersCount: 3,
    totalSpendInCents: 55500,
    status: "Active",
    lastActive: new Date("2026-08-15T09:30:00.000Z"),
  },
  {
    id: "CUST-104",
    name: "Sarah Jenkins",
    email: "s.jenkins@example.com",
    ordersCount: 12,
    totalSpendInCents: 410000,
    status: "Active",
    lastActive: new Date("2026-08-23T16:45:00.000Z"),
  },
];
