import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { OrderFinancialAnalyticsResponse } from "@/types/financials";

export const getAdminOrderFinancials = async (params?: {
  days?: number;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<OrderFinancialAnalyticsResponse | null> => {
  const res = await serverFetch(withQuery("/orders/admin/financial-analytics", params), true);
  return (res?.data as OrderFinancialAnalyticsResponse) ?? null;
};

export const getVendorOrderFinancials = async (params?: {
  days?: number;
  page?: number;
  limit?: number;
}): Promise<OrderFinancialAnalyticsResponse | null> => {
  const res = await serverFetch(withQuery("/vendor-analytics/financials", params), true);
  return (res?.data as OrderFinancialAnalyticsResponse) ?? null;
};
