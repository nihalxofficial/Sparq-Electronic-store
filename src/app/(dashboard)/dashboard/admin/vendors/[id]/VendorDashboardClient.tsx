"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  Package,
  RotateCcw,
  Sparkles,
  Star,
  Store,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-toastify";
import UserAvatar from "@/components/shared/UserAvatar";
import { formatOrderDate } from "@/lib/dateTime";
import { formatPrice } from "@/lib/currency";
import {
  couponDiscountWords,
  couponScopeWords,
  couponUsageWords,
  couponWindowWords,
  getCouponStateStyle,
} from "@/lib/couponWords";
import {
  getPromotionStateStyle,
  promotionEndWords,
  promotionSourceWords,
  promotionWindowWords,
} from "@/lib/promotionWords";
import { getVendorProductStatusStyle } from "@/lib/vendorProductStatus";
import { getVendorOrderStatusStyle } from "@/lib/vendorOrderStatus";
import { moderateSellerCoupon } from "@/lib/action/coupons";
import type { Coupon } from "@/types";
import type { VendorBoardDetail } from "@/types/vendorBoard";

/**
 * One seller's dashboard, as the store team reads it.
 *
 * Everything the seller sees on their own desk, on one page: the plan they are
 * standing on and every period behind it, the listings they sell, the shelves
 * they bought, the codes they run and the orders their shop took. Nothing here
 * is editable — the seller owns their shop — except the one thing the
 * marketplace has to be able to do: take a misleading code off the checkout.
 */

interface VendorDashboardClientProps {
  detail: VendorBoardDetail;
  currency: string;
}

const STORE_STATUS_BADGES: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30",
  suspended:
    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30",
  closed:
    "bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/30",
};

const STORE_STATUS_LABELS: Record<string, string> = {
  active: "Trading",
  suspended: "Suspended",
  closed: "Closed",
};

/** A record reads at a glance: green is clean, amber is patchy, rose is trouble. */
function rateText(rate: number): string {
  if (rate >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 70) return "text-sky-600 dark:text-sky-400";
  if (rate >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function Tile({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Store;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          {label}
        </p>
        <Icon className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
      </div>
      <p className="mt-1 text-lg font-extrabold text-[var(--foreground)]">{value}</p>
      <p className="text-[10px] text-[var(--foreground-muted)]">{note}</p>
    </div>
  );
}

export default function VendorDashboardClient({ detail, currency }: VendorDashboardClientProps) {
  const router = useRouter();
  const { vendor, account, store, subscription, products, promotions, coupons, orders } = detail;

  // The coupon row being written, and the reason the desk is about to give.
  const [busyCoupon, setBusyCoupon] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const money = (value: number) => formatPrice(value, currency);
  const compact = (value: number) => formatPrice(value, currency, { showDecimals: false });
  const live = subscription.live;
  const rate = Math.max(0, Math.min(100, Math.round(vendor.successRate)));

  /**
   * Taking a seller's code off the checkout, or putting it back.
   *
   * The desk never deletes a seller's code — the seller alone can. The reason
   * is written onto the row, and the seller reads it on their own desk.
   */
  const moderate = async (coupon: Coupon, action: "block" | "unblock") => {
    if (busyCoupon) return;

    setBusyCoupon(coupon._id);
    try {
      const res = await moderateSellerCoupon(
        coupon._id,
        action,
        action === "block" ? reason : undefined
      );
      if (res?.success === false) {
        toast.error(res.message || "The code could not be changed");
        return;
      }

      toast.success(
        res?.message || (action === "unblock" ? "Code is live again" : "Code blocked")
      );
      setBlocking(null);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusyCoupon(null);
    }
  };

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/admin/vendors"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All vendors
      </Link>

      {/* The shop, its owner and where it stands. */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div
          className="h-24 w-full bg-gradient-to-r from-[var(--brand-flat)]/25 via-[var(--surface-alt)] to-amber-500/20 bg-cover bg-center"
          style={vendor.coverImage ? { backgroundImage: `url(${vendor.coverImage})` } : undefined}
        />

        <div className="flex flex-wrap items-end justify-between gap-4 px-4 pb-4">
          <div className="flex min-w-0 items-end gap-3">
            <UserAvatar
              src={vendor.logo}
              name={vendor.name}
              size={64}
              className="-mt-8 rounded-2xl border-4 border-[var(--surface-elevated)] bg-[var(--surface-alt)] text-lg text-[var(--foreground)]"
            />

            <div className="min-w-0 pb-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-lg font-bold text-[var(--foreground)]">
                  {vendor.name || "Unnamed shop"}
                </h1>
                <span
                  className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    STORE_STATUS_BADGES[vendor.status] ?? STORE_STATUS_BADGES.closed
                  }`}
                >
                  {STORE_STATUS_LABELS[vendor.status] ?? vendor.status}
                </span>
                {vendor.isFeatured && (
                  <span className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
                    <Sparkles className="h-2.5 w-2.5" />
                    On the marquee
                  </span>
                )}
                {!vendor.isVisible && (
                  <span className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-600 dark:border-zinc-500/30 dark:bg-zinc-500/15 dark:text-zinc-300">
                    Hidden from the storefront
                  </span>
                )}
              </div>

              <p className="mt-1 truncate text-[11px] text-[var(--foreground-muted)]">
                {vendor.category || "No category"}
                {vendor.city ? ` · ${vendor.city}` : ""}
                {vendor.area ? `, ${vendor.area}` : ""}
                {vendor.storeId ? ` · joined ${formatOrderDate(vendor.createdAt)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {vendor.slug && (
              <Link
                href={`/vendors/${vendor.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Storefront
              </Link>
            )}
            <Link
              href="/dashboard/admin/coupons?owner=vendor"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
            >
              <Ticket className="h-3.5 w-3.5" />
              Seller codes desk
            </Link>
          </div>
        </div>
      </section>

      {/* The numbers, read from the rows that own them. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Tile
          label="Plan money"
          value={compact(subscription.totals.revenue)}
          note={`${subscription.totals.periods} period${subscription.totals.periods === 1 ? "" : "s"} bought`}
          icon={CircleDollarSign}
        />
        <Tile
          label="Paid time"
          value={`${vendor.paidDays} days`}
          note={`${Math.round(vendor.paidDays / 30)} months of plan`}
          icon={Store}
        />
        <Tile
          label="Sales"
          value={compact(vendor.sales)}
          note={`${vendor.orders} order${vendor.orders === 1 ? "" : "s"} · ${vendor.delivered} delivered`}
          icon={TrendingUp}
        />
        <Tile
          label="Delivery record"
          value={`${rate}%`}
          note={`${vendor.stopped} lost to refusals`}
          icon={CheckCircle2}
        />
        <Tile
          label="Points"
          value={vendor.points.total.toLocaleString()}
          note={`${vendor.points.planPoints.toLocaleString()} plan · ${vendor.points.sellPoints.toLocaleString()} sell`}
          icon={Star}
        />
        <Tile
          label="Codes"
          value={`${vendor.activeCoupons}/${vendor.coupons}`}
          note={`${compact(vendor.couponDiscountGiven)} given away`}
          icon={Ticket}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* The plan: what is running now and every period behind it. */}
        <div className="space-y-5 xl:col-span-2">
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">Subscription</h2>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  What the shop bought, when each period runs, and what it paid.
                </p>
              </div>
              <Link
                href="/dashboard/admin/vendor-plans"
                className="text-[11px] font-bold text-primary hover:underline"
              >
                The price list
              </Link>
            </div>

            {live ? (
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-[var(--surface-alt)] px-3 py-2.5">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Standing on
                  </p>
                  <p className="text-xs font-bold text-[var(--foreground)]">
                    {live.planName}
                    {live.billingCycle ? ` · ${live.billingCycle}` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Period
                  </p>
                  <p className="text-xs font-semibold text-[var(--foreground)]">
                    {formatOrderDate(live.startDate)} → {formatOrderDate(live.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Days left
                  </p>
                  <p
                    className={`text-xs font-bold ${
                      live.daysLeft <= 3 ? "text-rose-600 dark:text-rose-400" : "text-[var(--foreground)]"
                    }`}
                  >
                    {live.daysLeft}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Paid
                  </p>
                  <p className="text-xs font-semibold text-[var(--foreground)]">{money(live.pricePaid)}</p>
                </div>
                <span
                  className={`ml-auto inline-flex rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                    live.status === "grace"
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
                  }`}
                >
                  {live.status === "grace" ? "In grace" : "Running"}
                </span>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-[var(--surface-alt)] px-3 py-2.5 text-[11px] text-[var(--foreground-muted)]">
                No period is running. The shop sits on the free plan until it buys
                one, and its free allowances are the ones the API applies.
              </p>
            )}

            <div className="mt-4 overflow-x-auto">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Period history
              </p>
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                    <th className="py-2 pr-3 font-bold">Plan</th>
                    <th className="py-2 pr-3 font-bold">Status</th>
                    <th className="py-2 pr-3 font-bold">Window</th>
                    <th className="py-2 pr-3 text-right font-bold">Price paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60">
                  {subscription.history.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-5 text-center text-[var(--foreground-muted)]">
                        This shop has never bought a period.
                      </td>
                    </tr>
                  ) : (
                    subscription.history.map((period) => (
                      <tr key={period._id}>
                        <td className="py-2 pr-3 font-semibold text-[var(--foreground)]">
                          {period.planName}
                          {period.billingCycle ? ` · ${period.billingCycle}` : ""}
                        </td>
                        <td className="py-2 pr-3 capitalize text-[var(--foreground-muted)]">
                          {period.status}
                        </td>
                        <td className="py-2 pr-3 text-[var(--foreground-muted)]">
                          {formatOrderDate(period.startDate)} → {formatOrderDate(period.endDate)}
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold text-[var(--foreground)]">
                          {money(period.pricePaid)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 overflow-x-auto">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Payments
              </p>
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                    <th className="py-2 pr-3 font-bold">When</th>
                    <th className="py-2 pr-3 font-bold">Plan</th>
                    <th className="py-2 pr-3 font-bold">Method</th>
                    <th className="py-2 pr-3 font-bold">State</th>
                    <th className="py-2 pr-3 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]/60">
                  {subscription.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-5 text-center text-[var(--foreground-muted)]">
                        No payment has been recorded for this shop.
                      </td>
                    </tr>
                  ) : (
                    subscription.payments.map((payment) => (
                      <tr key={payment._id}>
                        <td className="py-2 pr-3 text-[var(--foreground-muted)]">
                          {formatOrderDate(payment.createdAt)}
                        </td>
                        <td className="py-2 pr-3 font-semibold text-[var(--foreground)]">
                          {payment.plan}
                          {payment.billingCycle ? ` · ${payment.billingCycle}` : ""}
                        </td>
                        <td className="py-2 pr-3 capitalize text-[var(--foreground-muted)]">
                          {payment.method || "—"}
                        </td>
                        <td className="py-2 pr-3">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${
                              payment.status === "success"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {payment.status}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right font-semibold text-[var(--foreground)]">
                          {money(payment.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* The account and the shop record behind it. */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-[var(--foreground)]">Shop &amp; account</h2>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Who trades, from where, and how the storefront is set up.
          </p>

          <div className="mt-3 flex items-center gap-2.5">
            <UserAvatar
              src={account.image}
              name={account.name}
              size={36}
              className="rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white"
            />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-[var(--foreground)]">
                {account.name || "No owner on file"}
              </p>
              <p className="truncate text-[10px] text-[var(--foreground-muted)]">{account.email}</p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 text-[11px]">
            {[
              { label: "Phone", value: account.phone || "—" },
              { label: "Account", value: account.role || "vendor" },
              { label: "Joined", value: formatOrderDate(account.joinedAt) },
              { label: "Slug", value: vendor.slug ? `/${vendor.slug}` : "—" },
              {
                label: "Address",
                value:
                  [store.address?.address, store.address?.area, store.address?.city, store.address?.division]
                    .filter(Boolean)
                    .join(", ") || "—",
              },
              {
                label: "Collection point",
                value:
                  [store.warehouse?.label, store.warehouse?.address, store.warehouse?.city]
                    .filter(Boolean)
                    .join(", ") || "Collects from the shop",
              },
              { label: "Website", value: store.website || "—" },
            ].map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-3">
                <dt className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {row.label}
                </dt>
                <dd className="truncate text-right font-semibold text-[var(--foreground)]">{row.value}</dd>
              </div>
            ))}
          </dl>

          {store.description && (
            <p className="mt-3 line-clamp-4 rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              {store.description}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground-muted)]">
              {vendor.productCount} listing{vendor.productCount === 1 ? "" : "s"}
            </span>
            <span className="rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground-muted)]">
              {vendor.rating ? `${vendor.rating.toFixed(1)}★ · ${vendor.reviewCount} review${vendor.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
            </span>
            <span className="rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-semibold text-[var(--foreground-muted)]">
              {detail.livePlacements} live placement{detail.livePlacements === 1 ? "" : "s"}
            </span>
          </div>
        </section>
      </div>

      {/* The listings the shop sells. */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex flex-wrap items-end justify-between gap-2 p-4 pb-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Products</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              The shop&rsquo;s newest {products.length === 200 ? "200 listings — older ones are on the catalogue desk" : `listing${products.length === 1 ? "" : "s"}`}.
            </p>
          </div>
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)]">
            {products.filter((product) => product.isFeatured).length} placed ·{" "}
            {products.filter((product) => !product.isVisible).length} hidden
          </p>
        </div>

        {products.length === 0 ? (
          <p className="px-4 py-8 text-center text-[11px] text-[var(--foreground-muted)]">
            This shop has not listed anything yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="px-4 py-2.5 font-bold">Listing</th>
                  <th className="px-4 py-2.5 text-right font-bold">Price</th>
                  <th className="px-4 py-2.5 text-right font-bold">Stock</th>
                  <th className="px-4 py-2.5 text-right font-bold">Sold</th>
                  <th className="px-4 py-2.5 text-right font-bold">Rating</th>
                  <th className="px-4 py-2.5 font-bold">State</th>
                  <th className="px-4 py-2.5 font-bold">Placement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {products.map((product) => {
                  const style = getVendorProductStatusStyle(product.vendorProductStatus);
                  return (
                    <tr key={product._id}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            src={product.image}
                            name={product.title}
                            size={30}
                            className="rounded-lg bg-[var(--surface-alt)] text-[var(--foreground)]"
                          />
                          <div className="min-w-0">
                            {product.slug ? (
                              <Link
                                href={`/shop/${product.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="block max-w-[240px] truncate font-semibold text-[var(--foreground)] hover:text-primary"
                              >
                                {product.title}
                              </Link>
                            ) : (
                              <p className="max-w-[240px] truncate font-semibold text-[var(--foreground)]">
                                {product.title}
                              </p>
                            )}
                            <p className="text-[10px] text-[var(--foreground-muted)]">
                              {product.isVisible ? "Visible" : "Hidden"}
                              {product.createdAt ? ` · listed ${formatOrderDate(product.createdAt)}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[var(--foreground)]">
                        {compact(product.price)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--foreground-muted)]">
                        {product.inStock ? product.stockQuantity : "Out"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--foreground-muted)]">{product.sellCount}</td>
                      <td className="px-4 py-2.5 text-right text-[var(--foreground-muted)]">
                        {product.rating ? `${product.rating.toFixed(1)}★` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-lg border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {product.isFeatured ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Sparkles className="h-3 w-3" />
                            {product.featuredUntil ? `until ${formatOrderDate(product.featuredUntil)}` : "featured"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--foreground-muted)]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* The shelves the shop bought or was granted. */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex flex-wrap items-end justify-between gap-2 p-4 pb-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Promotions</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Every placement this shop has held, on the marquee or on a listing.
            </p>
          </div>
          <Link
            href="/dashboard/admin/promotions"
            className="text-[11px] font-bold text-primary hover:underline"
          >
            The placements board
          </Link>
        </div>

        {promotions.length === 0 ? (
          <p className="px-4 py-8 text-center text-[11px] text-[var(--foreground-muted)]">
            This shop has never held a featured shelf.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="px-4 py-2.5 font-bold">What was lifted</th>
                  <th className="px-4 py-2.5 font-bold">Kind</th>
                  <th className="px-4 py-2.5 font-bold">Paid by</th>
                  <th className="px-4 py-2.5 font-bold">State</th>
                  <th className="px-4 py-2.5 font-bold">Window</th>
                  <th className="px-4 py-2.5 text-right font-bold">Left</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {promotions.map((placement) => {
                  const style = getPromotionStateStyle(placement.state);
                  return (
                    <tr key={placement._id}>
                      <td className="px-4 py-2.5">
                        <p className="max-w-[240px] truncate font-semibold text-[var(--foreground)]">
                          {placement.kind === "store"
                            ? placement.store?.name || "The whole shop"
                            : placement.product?.title || "A listing that is gone"}
                        </p>
                        {placement.endedReason && (
                          <p className="max-w-[240px] truncate text-[10px] text-[var(--foreground-muted)]">
                            {placement.endedReason} · {promotionEndWords(placement)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-2.5 capitalize text-[var(--foreground-muted)]">{placement.kind}</td>
                      <td className="px-4 py-2.5 text-[10px] text-[var(--foreground-muted)]">
                        {promotionSourceWords(placement, "staff")}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-lg border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-[var(--foreground-muted)]">
                        {promotionWindowWords(placement)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[var(--foreground)]">
                        {placement.state === "live" ? `${placement.daysRemaining}d` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* The codes the shop runs, and the desk's one lever over them. */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex flex-wrap items-end justify-between gap-2 p-4 pb-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Coupons</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              The shop owns these codes. This desk can take one off the checkout,
              put it back, or remove it — never edit it in their name.
            </p>
          </div>
          <p className="text-[10px] font-semibold text-[var(--foreground-muted)]">
            {coupons.filter((coupon) => coupon.isActive).length} live of {coupons.length}
          </p>
        </div>

        {coupons.length === 0 ? (
          <p className="px-4 py-8 text-center text-[11px] text-[var(--foreground-muted)]">
            This shop runs no codes.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {coupons.map((coupon) => {
              const style = getCouponStateStyle(coupon.state);
              const writing = busyCoupon === coupon._id;
              const blockingHere = blocking === coupon._id;

              return (
                <li key={coupon._id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="rounded-lg bg-[var(--surface-alt)] px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--foreground)]">
                          {coupon.code}
                        </p>
                        {coupon.title && (
                          <p className="truncate text-[11px] font-semibold text-[var(--foreground-muted)]">
                            {coupon.title}
                          </p>
                        )}
                        <span
                          className={`inline-flex rounded-lg border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                        >
                          {style.label}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-[10px] text-[var(--foreground-muted)]">
                        {couponDiscountWords(coupon, currency)} · {couponScopeWords(coupon, "staff")} ·{" "}
                        {couponWindowWords(coupon)}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-[var(--foreground-muted)]">
                        {couponUsageWords(coupon)}
                        {coupon.discountGiven > 0 && <> · {money(coupon.discountGiven)} given away</>}
                      </p>

                      {coupon.blockedReason && (
                        <p className="mt-1 inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
                          <Ban className="h-3 w-3" />
                          Blocked by the store team: {coupon.blockedReason}
                          {coupon.blockedAt ? ` (${formatOrderDate(coupon.blockedAt)})` : ""}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {coupon.isActive ? (
                        <button
                          type="button"
                          onClick={() => {
                            setBlocking(blockingHere ? null : coupon._id);
                            setReason("");
                          }}
                          disabled={writing}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-50 cursor-pointer"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Block
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => moderate(coupon, "unblock")}
                          disabled={writing}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-50 cursor-pointer"
                        >
                          {writing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Put back
                        </button>
                      )}

                      </div>
                  </div>

                  {/* Why the code is going quiet — the seller reads this on their desk. */}
                  {blockingHere && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--surface-alt)] px-3 py-2">
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        maxLength={200}
                        placeholder="Why is this code coming off? The seller will read this."
                        className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
                      />
                      <button
                        type="button"
                        onClick={() => moderate(coupon, "block")}
                        disabled={writing}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                      >
                        {writing && <Loader2 className="h-3 w-3 animate-spin" />}
                        Block code
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBlocking(null);
                          setReason("");
                        }}
                        className="rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* The last orders the shop took, so the desk can open one on the orders board. */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex flex-wrap items-end justify-between gap-2 p-4 pb-2">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Recent orders</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              The newest ten, of {orders.totals.orders} this shop has taken ·{" "}
              <span className={rateText(orders.totals.successRate)}>
                {orders.totals.successRate}% delivery record
              </span>
            </p>
          </div>
          <Link
            href="/dashboard/admin/orders"
            className="text-[11px] font-bold text-primary hover:underline"
          >
            The orders board
          </Link>
        </div>

        {orders.recent.length === 0 ? (
          <p className="px-4 py-8 text-center text-[11px] text-[var(--foreground-muted)]">
            This shop has not taken an order yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="px-4 py-2.5 font-bold">Order</th>
                  <th className="px-4 py-2.5 font-bold">Customer</th>
                  <th className="px-4 py-2.5 text-right font-bold">Items</th>
                  <th className="px-4 py-2.5 text-right font-bold">Total</th>
                  <th className="px-4 py-2.5 font-bold">State</th>
                  <th className="px-4 py-2.5 font-bold">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {orders.recent.map((order) => {
                  const style = getVendorOrderStatusStyle(order.status);
                  return (
                    <tr key={order._id}>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/dashboard/admin/orders?search=${encodeURIComponent(order.orderNumber)}`}
                          className="font-semibold text-[var(--foreground)] hover:text-primary"
                        >
                          {order.orderNumber || order._id.slice(-8)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-[var(--foreground-muted)]">
                        {order.customerName || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[var(--foreground-muted)]">{order.items}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-[var(--foreground)]">
                        {compact(order.subtotal)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex rounded-lg border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[10px] text-[var(--foreground-muted)]">
                        {formatOrderDate(order.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
        <Package className="h-3 w-3" />
        Read-only view. Placements are granted from the promotions board, and plans
        from the price list — the shop owns everything else.
      </p>
    </div>
  );
}
