/**
 * The store team's board of sellers, mirroring `vendor-admin.service` on the
 * API.
 *
 * One row is one seller account with a shop. Every figure on it is read from
 * the table that owns it — plan money from the payment rows, plan time from the
 * period rows, trade from the seller's own orders — so nothing here is a stored
 * copy that could drift from the desk it came from.
 */

import type { BillingCycle, VendorPagination, VendorStore } from "./vendor";
import type { Coupon } from "./coupon";
import type { FeaturedPlacement } from "./promotion";

/** The filters the directory reads from the URL. */
export type VendorBoardQuery = {
  search?: string;
  status?: string;
  /** `all`, or the plan id the seller is standing on right now. */
  plan?: string;
  featured?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

/**
 * A seller's standing, in the same two halves their own dashboard shows.
 *
 * Plan points are the permanent awards written on every plan period; sell
 * points are delivered units at the configured rate. Both come from the one
 * ledger in the API, so every screen shows the same total.
 */
export interface VendorPoints {
  /** Permanent points from every plan period the seller has held. */
  planPoints: number;
  /** Delivered units × the configured points-per-unit. */
  sellPoints: number;
  total: number;
}

export interface VendorBoardRow {
  /** The seller's account id: what a placement, a coupon and a plan hang off. */
  id: string;
  storeId: string;
  name: string;
  slug: string;
  logo: string;
  coverImage: string;
  category: string;
  city: string;
  area: string;
  ownerName: string;
  ownerEmail: string;
  ownerImage: string;
  status: string;
  isVisible: boolean;
  isFeatured: boolean;
  featuredUntil: string | null;
  productCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string | null;

  plan: string;
  planName: string;
  billingCycle: BillingCycle | null;
  subscriptionStatus: "active" | "grace" | "none";
  subscriptionEndsAt: string | null;
  subscriptionDaysLeft: number;

  /** Lifetime money the seller put into plans, and how many periods it bought. */
  subscriptionRevenue: number;
  subscriptionPeriods: number;
  /** Every day of plan time ever bought, added up. */
  paidDays: number;

  orders: number;
  sales: number;
  delivered: number;
  stopped: number;
  successRate: number;

  coupons: number;
  activeCoupons: number;
  couponDiscountGiven: number;

  points: VendorPoints;
}

/** The book, not the page: the figures the desk reads at a glance. */
export interface VendorBoardTotals {
  vendors: number;
  featured: number;
  subscriptionRevenue: number;
  sales: number;
  coupons: number;
}

export interface VendorBoardListResult {
  vendors: VendorBoardRow[];
  total: number;
  totals: VendorBoardTotals;
  statusCounts: Record<string, number>;
  /** The plan ids and names, for the filter — retired plans included. */
  plans: { id: string; name: string }[];
  pagination: VendorPagination;
}

/** The account behind the shop, as the seller's own dashboard names it. */
export interface VendorBoardAccount {
  id: string;
  name: string;
  email: string;
  image: string;
  phone: string;
  role: string;
  joinedAt: string | null;
}

/** One period the seller has bought, past or running. */
export interface VendorSubscriptionPeriod {
  _id: string;
  plan: string;
  planName: string;
  billingCycle: BillingCycle | null;
  status: string;
  pricePaid: number;
  startDate: string | null;
  endDate: string | null;
}

/** One payment row, so the desk can match money to a period. */
export interface VendorSubscriptionPayment {
  _id: string;
  plan: string;
  billingCycle: BillingCycle | null;
  amount: number;
  method: string;
  status: string;
  purpose: string;
  reference: string;
  createdAt: string | null;
}

export interface VendorSubscriptionDetail {
  live: {
    plan: string;
    planName: string;
    billingCycle: BillingCycle | null;
    status: string;
    startDate: string | null;
    endDate: string | null;
    graceEndsAt: string | null;
    pricePaid: number;
    daysLeft: number;
  } | null;
  history: VendorSubscriptionPeriod[];
  payments: VendorSubscriptionPayment[];
  totals: { revenue: number; paidDays: number; periods: number };
}

/** A listing as the board's dashboard reads it: enough to judge, not to edit. */
export interface VendorBoardProduct {
  _id: string;
  title: string;
  slug: string;
  image: string;
  price: number;
  inStock: boolean;
  stockQuantity: number;
  sellCount: number;
  rating: number;
  reviewCount: number;
  vendorProductStatus: string;
  isVisible: boolean;
  isFeatured: boolean;
  featuredUntil: string | null;
  createdAt: string | null;
}

/** The newest orders, named so the desk can open them on the orders board. */
export interface VendorBoardOrder {
  _id: string;
  orderNumber: string;
  customerName: string;
  subtotal: number;
  status: string;
  items: number;
  createdAt: string | null;
}

/** One seller, in full: the row, the account, the shop and the four tables. */
export interface VendorBoardDetail {
  vendor: VendorBoardRow;
  account: VendorBoardAccount;
  store: VendorStore;
  subscription: VendorSubscriptionDetail;
  products: VendorBoardProduct[];
  promotions: FeaturedPlacement[];
  promotionCounts: Record<string, number>;
  coupons: Coupon[];
  orders: {
    recent: VendorBoardOrder[];
    totals: {
      orders: number;
      sales: number;
      delivered: number;
      stopped: number;
      successRate: number;
    };
  };
  /** Placements still running, so the desk sees what the shop holds right now. */
  livePlacements: number;
}

/** The sort keys the directory offers, in the order the picker lists them. */
export const VENDOR_BOARD_SORTS: { key: string; label: string }[] = [
  { key: "points", label: "Placement points" },
  { key: "sales", label: "Sales" },
  { key: "subscription", label: "Plan money" },
  { key: "success", label: "Delivery record" },
  { key: "products", label: "Listings" },
  { key: "newest", label: "Newest shops" },
  { key: "name", label: "Shop name" },
];

/** The two readings of a placement, as the directory filters them. */
export const VENDOR_BOARD_FEATURED: { key: string; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "yes", label: "On the marquee" },
  { key: "no", label: "Off it" },
];

/** The shop states, with the words the store team uses for them. */
export const VENDOR_BOARD_STATUSES: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Trading" },
  { key: "suspended", label: "Suspended" },
  { key: "closed", label: "Closed" },
];
