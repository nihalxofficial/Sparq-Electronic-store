"use client";

import React, { useState } from "react";
import { Card } from "@heroui/react";
import { Calculator, Eye, TrendingDown, TrendingUp } from "lucide-react";
import type {
  OrderFinancialAnalyticsResponse,
  OrderFinancialBreakdown,
} from "@/types/financials";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import OrderFinancialModal from "./OrderFinancialModal";

interface OrderFinancialsSectionProps {
  data: OrderFinancialAnalyticsResponse | null;
  mode: "admin" | "vendor";
}

export default function OrderFinancialsSection({
  data,
  mode,
}: OrderFinancialsSectionProps) {
  const { formatPrice } = useSiteSettings();
  const [selectedOrder, setSelectedOrder] = useState<OrderFinancialBreakdown | null>(null);

  if (!data) return null;

  const { summary, orders } = data;
  const money = (val: number | null | undefined) => {
    if (val == null) return "—";
    const sign = val < 0 ? "-" : "";
    return `${sign}${formatPrice(Math.abs(val))}`;
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-[var(--foreground)] flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Order-Level Financial Analytics
          </h2>
          <p className="text-xs text-[var(--foreground-muted)]">
            {mode === "vendor"
              ? "Detailed revenue, discounts, fees, rider payout responsibility, and profit/loss for your own products."
              : "Complete money flow across customers, vendors, riders, and platform with before/after discount comparison."}
          </p>
        </div>
        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground-muted)]">
          Last {data.days} days · {summary.ordersCount} orders
        </span>
      </div>

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Customer Paid Total
          </p>
          <p className="text-lg font-extrabold text-primary mt-1">
            {money(summary.totalCustomerPaid)}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Orig: {money(summary.originalTotalProductPrice)}
          </p>
        </Card>

        <Card className="p-3.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Discounts, Coupons &amp; Points
          </p>
          <p className="text-lg font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            -{money(summary.totalProductDiscounts + summary.totalCouponDiscount + summary.totalPointsDiscount)}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Coupons: {money(summary.totalCouponDiscount)} · Pts: {money(summary.totalPointsDiscount)}
          </p>
        </Card>

        <Card className="p-3.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Profit (Without Discounts)
          </p>
          <p
            className={`text-lg font-extrabold mt-1 ${
              summary.totalProfitWithoutDiscounts >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {money(summary.totalProfitWithoutDiscounts)}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Cost: {money(summary.totalCost)}
          </p>
        </Card>

        <Card className="p-3.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Net Profit (With Discounts)
          </p>
          <p
            className={`text-lg font-extrabold mt-1 flex items-center gap-1 ${
              summary.totalProfitWithDiscounts >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {summary.totalProfitWithDiscounts >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {money(summary.totalProfitWithDiscounts)}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Rider payouts: {money(summary.totalRiderPayout)}
          </p>
        </Card>
      </div>

      {/* Orders Table */}
      <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-2xs p-0">
        {orders.length === 0 ? (
          <div className="p-10 text-center text-xs text-[var(--foreground-muted)]">
            No orders found in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)] text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3 px-4">Order</th>
                  <th className="py-3 px-3 text-right">Orig. Price</th>
                  <th className="py-3 px-3 text-right">Discounts &amp; Pts</th>
                  <th className="py-3 px-3 text-right">Customer Paid</th>
                  <th className="py-3 px-3 text-right">Cost</th>
                  <th className="py-3 px-3 text-right">Rider (Payer)</th>
                  <th className="py-3 px-3 text-right">P/L (No Disc.)</th>
                  <th className="py-3 px-3 text-right">P/L (Net)</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {orders.map((order) => {
                  const totalDisc =
                    order.totalProductDiscounts + order.couponDiscount + order.pointsDiscount;
                  return (
                    <tr key={order.orderId} className="hover:bg-[var(--surface-alt)]/40">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <p className="font-bold text-[var(--foreground)]">{order.orderNumber}</p>
                        <p className="text-[10px] text-[var(--foreground-muted)] capitalize">
                          {order.orderStatus} · {order.items.length} item(s)
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {money(order.originalTotalProductPrice)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap text-amber-600 dark:text-amber-400">
                        -{money(totalDisc)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap font-bold text-primary">
                        {money(order.finalCustomerPaid)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {money(order.totalCost)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span>{money(order.riderPayout)}</span>
                        <span className="block text-[10px] text-[var(--foreground-muted)]">
                          {order.riderPayoutPayer}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-3 text-right whitespace-nowrap font-bold ${
                          (order.expectedProfitWithoutDiscounts ?? 0) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {money(order.expectedProfitWithoutDiscounts)}
                      </td>
                      <td
                        className={`py-3 px-3 text-right whitespace-nowrap font-extrabold ${
                          (order.expectedProfitWithDiscounts ?? 0) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {money(order.expectedProfitWithDiscounts)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-primary/10 hover:text-primary text-[11px] font-semibold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <OrderFinancialModal
        isOpen={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) setSelectedOrder(null);
        }}
        order={selectedOrder}
        mode={mode}
      />
    </section>
  );
}
