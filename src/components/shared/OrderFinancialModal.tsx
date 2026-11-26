"use client";

import React from "react";
import { Button, Modal } from "@heroui/react";
import {
  ArrowRight,
  Calculator,
  DollarSign,
  Package,
  TrendingDown,
  TrendingUp,
  Truck,
  X,
} from "lucide-react";
import type { OrderFinancialBreakdown } from "@/types/financials";
import { useSiteSettings } from "@/context/SiteSettingsContext";

interface OrderFinancialModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: OrderFinancialBreakdown | null;
  mode: "admin" | "vendor";
  isLoading?: boolean;
  error?: string | null;
}

export default function OrderFinancialModal({
  isOpen,
  onOpenChange,
  order,
  mode,
  isLoading = false,
  error = null,
}: OrderFinancialModalProps) {
  const { formatPrice } = useSiteSettings();

  const money = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    const sign = val < 0 ? "-" : "";
    return `${sign}${formatPrice(Math.abs(val))}`;
  };

  const profitTone = (val: number | null | undefined) => {
    if (val == null) return "text-[var(--foreground-muted)]";
    return val >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="cover" className="max-w-5xl mx-auto my-4">
          <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] pb-4">
              <div className="space-y-1">
                <Modal.Heading className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Order Financial Breakdown {order ? `· ${order.orderNumber}` : ""}
                </Modal.Heading>
                {order && (
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {new Date(order.createdAt).toLocaleString()} · Status:{" "}
                    <span className="font-semibold capitalize text-[var(--foreground)]">
                      {order.orderStatus}
                    </span>{" "}
                    · Payment:{" "}
                    <span className="font-semibold uppercase text-[var(--foreground)]">
                      {order.paymentMethod}
                    </span>{" "}
                    ({order.paymentStatus})
                  </p>
                )}
              </div>
              <Modal.CloseTrigger className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] cursor-pointer">
                <X className="w-4 h-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="space-y-6">
              {isLoading ? (
                <div className="py-12 text-center text-xs text-[var(--foreground-muted)]">
                  Loading order financial calculation...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-6 text-center text-xs text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              ) : !order ? (
                <div className="py-12 text-center text-xs text-[var(--foreground-muted)]">
                  No order selected.
                </div>
              ) : (
                <>
                  {/* 1. Profit Comparison (Before vs After Discounts) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)]/60 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        Original Total
                      </p>
                      <p className="text-base font-extrabold mt-1">
                        {money(order.originalTotalProductPrice)}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                        Before product &amp; order discounts
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)]/60 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        Final Customer Paid
                      </p>
                      <p className="text-base font-extrabold mt-1 text-primary">
                        {money(order.finalCustomerPaid)}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                        Includes {money(order.deliveryCharge)} shipping
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)]/60 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        Profit (No Discounts)
                      </p>
                      <p className={`text-base font-extrabold mt-1 ${profitTone(order.expectedProfitWithoutDiscounts)}`}>
                        {money(order.expectedProfitWithoutDiscounts)}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                        Baseline margin without promos
                      </p>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)]/60 p-3.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1">
                        {order.expectedProfitWithDiscounts != null &&
                        order.expectedProfitWithDiscounts >= 0 ? (
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-3 h-3 text-rose-500" />
                        )}
                        Net Profit (With Discounts)
                      </p>
                      <p className={`text-base font-extrabold mt-1 ${profitTone(order.expectedProfitWithDiscounts)}`}>
                        {money(order.expectedProfitWithDiscounts)}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                        After discounts, coupons, points &amp; fees
                      </p>
                    </div>
                  </div>

                  {/* 2. Order-Level Breakdown & Money Flow */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-[var(--border-color)] p-4 space-y-2.5">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Order-Level Calculation
                      </h3>
                      <dl className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <dt className="text-[var(--foreground-muted)]">Original Product Total</dt>
                          <dd className="font-semibold">{money(order.originalTotalProductPrice)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--foreground-muted)]">Product Sale Discounts</dt>
                          <dd className="font-semibold text-amber-600 dark:text-amber-400">
                            -{money(order.totalProductDiscounts)}
                          </dd>
                        </div>
                        {(mode === "admin" || order.couponDiscount > 0) && (
                          <div className="flex justify-between">
                            <dt className="text-[var(--foreground-muted)]">
                              Coupon Discount {order.couponCode ? `(${order.couponCode})` : ""}
                            </dt>
                            <dd className="font-semibold text-amber-600 dark:text-amber-400">
                              -{money(order.couponDiscount)}
                            </dd>
                          </div>
                        )}
                        {mode === "admin" && (
                          <div className="flex justify-between">
                            <dt className="text-[var(--foreground-muted)]">
                              Redeemed Points ({order.pointsRedeemed} pts)
                            </dt>
                            <dd className="font-semibold text-amber-600 dark:text-amber-400">
                              -{money(order.pointsDiscount)}
                            </dd>
                          </div>
                        )}
                        {mode === "admin" && (
                          <div className="flex justify-between">
                            <dt className="text-[var(--foreground-muted)]">Delivery Charge (Customer)</dt>
                            <dd className="font-semibold">{money(order.deliveryCharge)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-[var(--border-color)] pt-1.5">
                          <dt className="font-bold">
                            {mode === "vendor" ? "Your Gross Revenue" : "Final Customer Paid"}
                          </dt>
                          <dd className="font-extrabold text-primary">{money(order.finalCustomerPaid)}</dd>
                        </div>
                        <div className="flex justify-between pt-1">
                          <dt className="text-[var(--foreground-muted)]">Acquisition / Product Cost</dt>
                          <dd className="font-semibold text-rose-600 dark:text-rose-400">
                            {order.totalCost != null ? `-${money(order.totalCost)}` : "Missing cost"}
                          </dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-[var(--foreground-muted)]">Platform Commission</dt>
                          <dd className="font-semibold">{money(order.platformCommissionTotal)}</dd>
                        </div>
                        {(mode === "admin" || order.vendorRiderPayout > 0) && (
                          <div className="flex justify-between">
                            <dt className="text-[var(--foreground-muted)]">
                              Rider Payout ({order.riderPayoutPayer})
                            </dt>
                            <dd className="font-semibold text-rose-600 dark:text-rose-400">
                              -{money(order.riderPayout)}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="rounded-2xl border border-[var(--border-color)] p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Money Flow &amp; Responsibility
                      </h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between rounded-xl bg-[var(--surface-alt)] px-3 py-2">
                          <span className="font-medium">Customer Paid (Inflow)</span>
                          <span className="font-extrabold text-primary">{money(order.moneyFlow.customerPaid)}</span>
                        </div>
                        <div className="flex items-center justify-center text-[var(--foreground-muted)]">
                          <ArrowRight className="w-4 h-4 rotate-90" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="rounded-xl border border-[var(--border-color)] p-2.5">
                            <p className="text-[10px] text-[var(--foreground-muted)]">To Vendors</p>
                            <p className="font-bold mt-0.5">{money(order.moneyFlow.toVendors)}</p>
                          </div>
                          <div className="rounded-xl border border-[var(--border-color)] p-2.5">
                            <p className="text-[10px] text-[var(--foreground-muted)]">To Rider</p>
                            <p className="font-bold mt-0.5">{money(order.moneyFlow.toRiders)}</p>
                          </div>
                          <div className="rounded-xl border border-[var(--border-color)] p-2.5">
                            <p className="text-[10px] text-[var(--foreground-muted)]">
                              {mode === "vendor" ? "Platform / Shipping" : "To Platform"}
                            </p>
                            <p className="font-bold mt-0.5">{money(order.moneyFlow.toPlatform)}</p>
                          </div>
                        </div>
                        <div className="rounded-xl bg-[var(--surface-alt)]/60 px-3 py-2 text-[11px] text-[var(--foreground-muted)] space-y-1">
                          {mode === "admin" && (
                            <>
                              <p>
                                <span className="font-semibold text-[var(--foreground)]">Profit Split:</span>{" "}
                                Admin:{" "}
                                <span className={`font-bold ${profitTone(order.adminProfit)}`}>
                                  {money(order.adminProfit)}
                                </span>{" "}
                                · Vendor:{" "}
                                <span className={`font-bold ${profitTone(order.vendorProfit)}`}>
                                  {money(order.vendorProfit)}
                                </span>
                              </p>
                              <p>
                                <span className="font-semibold text-[var(--foreground)]">Rider Payout Split:</span>{" "}
                                Admin: {money(order.adminRiderPayout)} · Vendor: {money(order.vendorRiderPayout)}
                              </p>
                            </>
                          )}
                          {order.missingCostCount > 0 && (
                            <p className="text-amber-600 dark:text-amber-400">
                              {order.missingCostCount} item(s) have no acquisition cost recorded.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Owner-Grouped Calculations (Admin vs Each Vendor) */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> Breakdown by Owner ({order.items.length} item{order.items.length === 1 ? "" : "s"})
                    </h3>

                    {(order.ownerGroups && order.ownerGroups.length > 0
                      ? order.ownerGroups
                      : [
                          {
                            ownerKey: "all",
                            ownerType: mode,
                            ownerLabel: mode === "vendor" ? "Your Store" : "Order Items",
                            itemsCount: order.items.length,
                            originalTotal: order.originalTotalProductPrice,
                            soldTotal: order.soldSubtotal,
                            couponDiscount: order.couponDiscount,
                            pointsDiscount: order.pointsDiscount,
                            customerPaid: order.finalCustomerPaid,
                            totalCost: order.totalCost,
                            platformCommission: order.platformCommissionTotal,
                            riderPayout: order.riderPayout,
                            netProfit: order.expectedProfitWithDiscounts,
                            items: order.items,
                          },
                        ]
                    ).map((group) => (
                      <div
                        key={group.ownerKey}
                        className="rounded-2xl border border-[var(--border-color)] overflow-hidden"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-alt)] px-4 py-2.5 border-b border-[var(--border-color)]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                group.ownerType === "admin"
                                  ? "bg-primary/15 text-primary"
                                  : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
                              }`}
                            >
                              {group.ownerType === "admin" ? "Admin" : "Vendor"}
                            </span>
                            <span className="text-xs font-bold text-[var(--foreground)]">
                              {group.ownerLabel}
                            </span>
                            <span className="text-[10px] text-[var(--foreground-muted)]">
                              ({group.itemsCount} item{group.itemsCount === 1 ? "" : "s"})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-[11px]">
                            <span className="text-[var(--foreground-muted)]">
                              Sold: <strong className="text-[var(--foreground)]">{money(group.soldTotal)}</strong>
                            </span>
                            {group.couponDiscount > 0 && (
                              <span className="text-amber-600 dark:text-amber-400">
                                Coupon: <strong>-{money(group.couponDiscount)}</strong>
                              </span>
                            )}
                            {group.platformCommission > 0 && (
                              <span className="text-[var(--foreground-muted)]">
                                Comm: <strong className="text-[var(--foreground)]">{money(group.platformCommission)}</strong>
                              </span>
                            )}
                            <span>
                              Owner Net P/L:{" "}
                              <strong className={profitTone(group.netProfit)}>
                                {money(group.netProfit)}
                              </strong>
                            </span>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-[11px]">
                            <thead>
                              <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/40 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                                <th className="py-2 px-3">Product</th>
                                <th className="py-2 px-2 text-right">Qty</th>
                                <th className="py-2 px-2 text-right">Orig.</th>
                                <th className="py-2 px-2 text-right">Sold</th>
                                {(mode === "admin" || group.couponDiscount > 0) && (
                                  <th className="py-2 px-2 text-right">Coupon</th>
                                )}
                                {mode === "admin" && group.pointsDiscount > 0 && (
                                  <th className="py-2 px-2 text-right">Points</th>
                                )}
                                <th className="py-2 px-2 text-right">Paid</th>
                                <th className="py-2 px-2 text-right">Cost</th>
                                {group.platformCommission > 0 && (
                                  <th className="py-2 px-2 text-right">Comm.</th>
                                )}
                                {(mode === "admin" || group.riderPayout > 0) && (
                                  <th className="py-2 px-2 text-right">Rider</th>
                                )}
                                <th className="py-2 px-2 text-right">P/L (No Disc.)</th>
                                <th className="py-2 px-3 text-right">P/L (Net)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]/60">
                              {group.items.map((item, idx) => (
                                <tr key={`${item.productId}-${idx}`} className="hover:bg-[var(--surface-alt)]/40">
                                  <td className="py-2.5 px-3 min-w-[160px]">
                                    <p className="font-bold text-[var(--foreground)] line-clamp-1">{item.title}</p>
                                  </td>
                                  <td className="py-2.5 px-2 text-right font-mono">{item.quantity}</td>
                                  <td className="py-2.5 px-2 text-right">{money(item.originalTotal)}</td>
                                  <td className="py-2.5 px-2 text-right">{money(item.soldTotal)}</td>
                                  {(mode === "admin" || group.couponDiscount > 0) && (
                                    <td className="py-2.5 px-2 text-right text-amber-600 dark:text-amber-400">
                                      -{money(item.couponDiscountAllocated)}
                                    </td>
                                  )}
                                  {mode === "admin" && group.pointsDiscount > 0 && (
                                    <td className="py-2.5 px-2 text-right text-amber-600 dark:text-amber-400">
                                      -{money(item.pointsValueAllocated)}
                                    </td>
                                  )}
                                  <td className="py-2.5 px-2 text-right font-bold">{money(item.finalCustomerPaid)}</td>
                                  <td className="py-2.5 px-2 text-right">{money(item.totalCost)}</td>
                                  {group.platformCommission > 0 && (
                                    <td className="py-2.5 px-2 text-right">
                                      {money(item.platformCommission)}
                                      {item.commissionPercent > 0 && (
                                        <span className="block text-[9px] text-[var(--foreground-muted)]">
                                          ({item.commissionPercent}%)
                                        </span>
                                      )}
                                    </td>
                                  )}
                                  {(mode === "admin" || group.riderPayout > 0) && (
                                    <td className="py-2.5 px-2 text-right">
                                      {money(item.riderPayoutShare)}
                                      <span className="block text-[9px] text-[var(--foreground-muted)]">
                                        {item.riderPayoutPayer}
                                      </span>
                                    </td>
                                  )}
                                  <td className={`py-2.5 px-2 text-right font-bold ${profitTone(item.profitBeforeDiscounts)}`}>
                                    {money(item.profitBeforeDiscounts)}
                                  </td>
                                  <td className={`py-2.5 px-3 text-right font-extrabold ${profitTone(item.profitAfterDiscounts)}`}>
                                    {money(item.profitAfterDiscounts)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Modal.Body>

            <Modal.Footer className="flex justify-end pt-3 border-t border-[var(--border-color)]">
              <Button
                variant="outline"
                onPress={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-bold cursor-pointer"
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
