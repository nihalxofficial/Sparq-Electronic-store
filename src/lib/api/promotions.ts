import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { FeaturedPlacement, PromotionListResult } from "@/types";

/**
 * The store team's promotions board.
 *
 * The board reads everyone's placements or one seller's, and the narrowing
 * helpers live here because the shape is the same one the seller's own desk
 * uses — one row, one reader, whichever desk asked for it.
 */

export type PromotionQuery = {
  status?: string;
  kind?: string;
  vendorId?: string;
  page?: number;
  limit?: number;
};

export const getPromotions = async (params?: PromotionQuery) => {
  return serverFetch(withQuery("/promotions", params), true);
};

/** A null read becomes an empty board rather than a crashed render. */
export const asPromotionList = (payload: unknown): PromotionListResult | null => {
  return (payload as { data?: PromotionListResult } | null)?.data ?? null;
};

export const asPromotion = (payload: unknown): FeaturedPlacement | null => {
  return (payload as { data?: FeaturedPlacement } | null)?.data ?? null;
};

/** One seller's featured window and standing, as the grant picker needs it. */
export type VendorPlanWindow = {
  vendorId: string;
  storeName: string;
  plan: string;
  isLive: boolean;
  featuredWindowDays: number;
  planDaysRemaining: number;
  /** The seller's total points, the same number every other screen shows. */
  points: number;
};

/** Each seller's plan window, so the grant picker can show the cap it applies. */
export const getVendorPlanWindows = async (): Promise<VendorPlanWindow[]> => {
  const res = await serverFetch("/promotions/vendor-plans", true);
  const rows = (res as { data?: VendorPlanWindow[] } | null)?.data;
  return Array.isArray(rows) ? rows : [];
};

/** One permanent plan-period award: where and when plan points came in. */
export type VendorPointAward = {
  id: string;
  plan: string;
  billingCycle: string;
  points: number;
  note: string;
  awardedAt: string | null;
};

/** A seller's points and where they came from. */
export type VendorPoints = {
  perUnit: number;
  sellPoints: number;
  soldUnits: number;
  planPoints: number;
  totalPoints: number;
  position: number;
  totalVendors: number;
  products: { productId: string; title: string; units: number; points: number }[];
  history: VendorPointAward[];
};

/** The signed-in seller's points: sell, placement, total, and their position. */
export const getMyVendorPoints = async (): Promise<VendorPoints | null> => {
  const res = await serverFetch("/vendor-promotions/points", true);
  return (res as { data?: VendorPoints } | null)?.data ?? null;
};
