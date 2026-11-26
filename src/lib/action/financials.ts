"use server";

import { serverFetch } from "../core/server";
import type { OrderFinancialAnalyticsResponse, OrderFinancialBreakdown } from "@/types/financials";

export async function getAdminOrderFinancialBreakdownAction(orderId: string): Promise<{
  ok: boolean;
  data: OrderFinancialBreakdown | null;
  message?: string;
}> {
  try {
    const res = await serverFetch(`/orders/${orderId}/financial-breakdown`, true);
    if (!res?.success || !res?.data) {
      return { ok: false, data: null, message: res?.message || "Failed to load financial breakdown" };
    }
    return { ok: true, data: res.data as OrderFinancialBreakdown };
  } catch (err: any) {
    return { ok: false, data: null, message: err?.message || "Failed to load financial breakdown" };
  }
}

export async function getVendorOrderFinancialBreakdownAction(orderIdOrNumber: string): Promise<{
  ok: boolean;
  data: OrderFinancialBreakdown | null;
  message?: string;
}> {
  try {
    const res = await serverFetch("/vendor-analytics/financials?days=365&limit=200", true);
    if (!res?.success || !res?.data) {
      return {
        ok: false,
        data: null,
        message: res?.message || "Detailed order financial analytics requires a Premium or Advanced plan.",
      };
    }
    const payload = res.data as OrderFinancialAnalyticsResponse;
    const match =
      payload.orders.find(
        (o) => o.orderId === orderIdOrNumber || o.orderNumber === orderIdOrNumber
      ) ?? null;
    if (!match) {
      return {
        ok: false,
        data: null,
        message: "Financial breakdown is not available for this order yet.",
      };
    }
    return { ok: true, data: match };
  } catch (err: any) {
    return { ok: false, data: null, message: err?.message || "Failed to load financial breakdown" };
  }
}
