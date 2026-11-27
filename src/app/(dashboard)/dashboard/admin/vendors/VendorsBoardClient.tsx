"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  Sparkles,
  Store,
  Ticket,
} from "lucide-react";
import UserAvatar from "@/components/shared/UserAvatar";
import { Select, ListBox } from "@heroui/react";
import { formatPrice } from "@/lib/currency";
import type {
  VendorBoardListResult,
  VendorBoardRow,
  VendorPoints,
} from "@/types/vendorBoard";
import { VENDOR_BOARD_FEATURED, VENDOR_BOARD_SORTS, VENDOR_BOARD_STATUSES } from "@/types/vendorBoard";

/**
 * The store team's board of sellers.
 *
 * Every column is read from the row the API built, so nothing here is summed on
 * the screen: the plan money comes from the payment ledger, the plan time from
 * the period history, the trade and the delivery record from the seller's own
 * orders. Filters, the sort and the page live in the URL, so a refresh — or a
 * link sent to another admin — reads the same board.
 */

interface VendorsBoardClientProps {
  result: VendorBoardListResult;
  filters: {
    status: string;
    plan: string;
    featured: string;
    sort: string;
    search: string;
  };
  currency: string;
}

/** The pill each shop state wears. */
const STATUS_BADGES: Record<string, string> = {
  active:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30",
  suspended:
    "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30",
  closed:
    "bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/30",
};

/** The words the desk uses for each shop state. */
const STATUS_LABELS: Record<string, string> = {
  all: "All",
  active: "Trading",
  suspended: "Suspended",
  closed: "Closed",
};

/** A record reads at a glance: green is clean, amber is patchy, rose is trouble. */
function rateTone(rate: number): string {
  if (rate >= 90) return "bg-emerald-500";
  if (rate >= 70) return "bg-sky-500";
  if (rate >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function rateText(rate: number): string {
  if (rate >= 90) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 70) return "text-sky-600 dark:text-sky-400";
  if (rate >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

/** The two readings behind the total, in the same split the seller sees. */
function pointsWords(points: VendorPoints): string {
  return `${points.planPoints.toLocaleString()} from plan periods · ${points.sellPoints.toLocaleString()} from delivered units`;
}

function VendorRow({ vendor, currency }: { vendor: VendorBoardRow; currency: string }) {
  const router = useRouter();
  const href = `/dashboard/admin/vendors/${vendor.id}`;
  const money = (value: number) => formatPrice(value, currency, { showDecimals: false });
  const rate = Math.max(0, Math.min(100, Math.round(vendor.successRate)));

  return (
    <tr
      onClick={() => router.push(href)}
      className="cursor-pointer transition-colors hover:bg-[var(--surface-alt)]/80 dark:hover:bg-[var(--surface)]/40"
    >
      {/* The shop and the account behind it. */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <UserAvatar
            src={vendor.logo}
            name={vendor.name}
            size={34}
            className="rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)]"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={href}
                onClick={(event) => event.stopPropagation()}
                className="max-w-[170px] truncate text-xs font-bold text-[var(--foreground)] transition-colors hover:text-primary"
              >
                {vendor.name || "Unnamed shop"}
              </Link>
              {vendor.isFeatured && (
                <span className="inline-flex items-center gap-0.5 rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200">
                  <Sparkles className="h-2.5 w-2.5" />
                  Marquee
                </span>
              )}
              {!vendor.isVisible && (
                <span className="rounded border border-zinc-300 bg-zinc-100 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-zinc-600 dark:border-zinc-500/30 dark:bg-zinc-500/15 dark:text-zinc-300">
                  Hidden
                </span>
              )}
            </div>
            <p className="mt-0.5 max-w-[190px] truncate text-[10px] text-[var(--foreground-muted)]">
              {vendor.ownerName || "No owner on file"}
              {vendor.city ? ` · ${vendor.city}` : ""}
              {vendor.category ? ` · ${vendor.category}` : ""}
            </p>
          </div>
        </div>
      </td>

      {/* Where the shop stands on the price list. */}
      <td className="px-4 py-3">
        <p className="text-[11px] font-bold text-[var(--foreground)]">{vendor.planName}</p>
        <p className="mt-0.5 text-[10px] text-[var(--foreground-muted)]">
          {vendor.subscriptionStatus === "none"
            ? "No period running"
            : vendor.subscriptionStatus === "grace"
              ? "In grace"
              : `${vendor.subscriptionDaysLeft} day${vendor.subscriptionDaysLeft === 1 ? "" : "s"} left`}
          {vendor.billingCycle ? ` · ${vendor.billingCycle}` : ""}
        </p>
        <span
          className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            STATUS_BADGES[vendor.status] ?? STATUS_BADGES.closed
          }`}
        >
          {STATUS_LABELS[vendor.status] ?? vendor.status}
        </span>
      </td>

      {/* What the plans have collected, and how long they have run. */}
      <td className="px-4 py-3 text-right">
        <p className="text-xs font-bold text-[var(--foreground)]">
          {money(vendor.subscriptionRevenue)}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--foreground-muted)]">
          {vendor.paidDays} paid days · {vendor.subscriptionPeriods} period
          {vendor.subscriptionPeriods === 1 ? "" : "s"}
        </p>
      </td>

      {/* What the shop has actually sold. */}
      <td className="px-4 py-3 text-right">
        <p className="text-xs font-bold text-[var(--foreground)]">{money(vendor.sales)}</p>
        <p className="mt-0.5 text-[10px] text-[var(--foreground-muted)]">
          {vendor.orders} order{vendor.orders === 1 ? "" : "s"} · {vendor.productCount} listing
          {vendor.productCount === 1 ? "" : "s"}
        </p>
      </td>

      {/* How the orders it took ended. */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-alt)]">
            <div className={`h-full rounded-full ${rateTone(rate)}`} style={{ width: `${rate}%` }} />
          </div>
          <span className={`text-[11px] font-bold ${rateText(rate)}`}>{rate}%</span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
          {vendor.delivered} delivered · {vendor.stopped} lost
        </p>
      </td>

      {/* The codes the shop runs, and what they have given away. */}
      <td className="px-4 py-3 text-center">
        <p className="text-[11px] font-bold text-[var(--foreground)]">
          {vendor.activeCoupons}/{vendor.coupons}
        </p>
        <p className="mt-0.5 text-[10px] text-[var(--foreground-muted)]">
          {vendor.couponDiscountGiven > 0 ? `${money(vendor.couponDiscountGiven)} given` : "none given"}
        </p>
      </td>

      {/* The standing the board is ranked by, split the same way the seller sees it. */}
      <td className="px-4 py-3 text-right" title={pointsWords(vendor.points)}>
        <p className="text-sm font-extrabold text-[var(--foreground)]">
          {vendor.points.total.toLocaleString()}
        </p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
          {vendor.points.planPoints.toLocaleString()} plan · {vendor.points.sellPoints.toLocaleString()} sell
        </p>
      </td>

      <td className="pr-4 text-right">
        <ChevronRight className="h-4 w-4 text-[var(--foreground-muted)]" />
      </td>
    </tr>
  );
}

export default function VendorsBoardClient({ result, filters, currency }: VendorsBoardClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);

  const go = (next: Partial<{ status: string; plan: string; featured: string; sort: string; page: number }>) => {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? filters.status;
    const nextPlan = next.plan ?? filters.plan;
    const nextFeatured = next.featured ?? filters.featured;
    const nextSort = next.sort ?? filters.sort;
    const nextSearch = search.trim();
    const page = next.page ?? 1;

    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextPlan && nextPlan !== "all") params.set("plan", nextPlan);
    if (nextFeatured && nextFeatured !== "all") params.set("featured", nextFeatured);
    if (nextSort && nextSort !== "points") params.set("sort", nextSort);
    if (nextSearch) params.set("search", nextSearch);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/admin/vendors?${query}` : "/dashboard/admin/vendors");
  };

  const money = (value: number) => formatPrice(value, currency, { showDecimals: false });
  const { totals, pagination } = result;

  const tiles = [
    { label: "Shops", value: String(totals.vendors), note: "every seller with a shop", icon: Store },
    { label: "On the marquee", value: String(totals.featured), note: "placed right now", icon: Sparkles },
    { label: "Plan money", value: money(totals.subscriptionRevenue), note: "lifetime, every plan", icon: Ticket },
    { label: "Sellers' sales", value: money(totals.sales), note: "orders that were not lost", icon: Store },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Vendors</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Every shop and its standing: what it pays for its plans, how long it
            has paid, what it sold and how cleanly it delivered.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/admin/vendors/applications"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
          >
            <Inbox className="h-3.5 w-3.5" />
            Vendor applications
          </Link>
          <Link
            href="/dashboard/admin/coupons?owner=vendor"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
          >
            <Ticket className="h-3.5 w-3.5" />
            Seller codes
          </Link>
        </div>
      </header>

      {/* The book at a glance — the figures are the whole book, not this page. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                {tile.label}
              </p>
              <tile.icon className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
            </div>
            <p className="mt-1 text-lg font-extrabold text-[var(--foreground)]">{tile.value}</p>
            <p className="text-[10px] text-[var(--foreground-muted)]">{tile.note}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {VENDOR_BOARD_STATUSES.map((tab) => {
            const active = filters.status === tab.key;
            const count = tab.key === "all" ? result.statusCounts.all || 0 : result.statusCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => go({ status: tab.key, page: 1 })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded px-1 text-[9px] font-bold ${active ? "bg-white/20" : "bg-[var(--surface-alt)]"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {VENDOR_BOARD_FEATURED.map((tab) => {
              const active = filters.featured === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => go({ featured: tab.key, page: 1 })}
                  className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    active
                      ? "bg-[var(--surface-alt)] text-[var(--foreground)]"
                      : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}

            <Select
              selectedKey={filters.plan}
              onSelectionChange={(key) => go({ plan: String(key), page: 1 })}
              aria-label="Filter by plan"
            >
              <Select.Trigger className="h-8 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--foreground)]">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="all" textValue="Every plan">
                    Every plan
                  </ListBox.Item>
                  {result.plans.map((plan) => (
                    <ListBox.Item key={plan.id} id={plan.id} textValue={plan.name}>
                      {plan.name}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>

            <Select
              selectedKey={filters.sort}
              onSelectionChange={(key) => go({ sort: String(key), page: 1 })}
              aria-label="Sort vendors"
            >
              <Select.Trigger className="h-8 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2 text-[11px] font-semibold text-[var(--foreground)]">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {VENDOR_BOARD_SORTS.map((sort) => (
                    <ListBox.Item key={sort.key} id={sort.key} textValue={`Sort: ${sort.label}`}>
                      Sort: {sort.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              go({ page: 1 });
            }}
            className="relative w-full sm:w-64"
          >
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Shop, owner, city or slug"
              className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] pl-9 pr-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
            />
          </form>
        </div>
      </div>

      {/* The shops */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {result.vendors.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Store className="h-6 w-6 text-[var(--foreground-muted)]" />
            <p className="text-xs font-semibold text-[var(--foreground)]">No shops here</p>
            <p className="max-w-sm text-[11px] text-[var(--foreground-muted)]">
              {filters.search || filters.status !== "all" || filters.plan !== "all" || filters.featured !== "all"
                ? "Nothing matches this view. Clear a filter to widen it."
                : "A shop appears here once an application is approved and the seller opens their desk."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="px-4 py-2.5 font-bold">Shop</th>
                  <th className="px-4 py-2.5 font-bold">Plan</th>
                  <th className="px-4 py-2.5 text-right font-bold">Plan money</th>
                  <th className="px-4 py-2.5 text-right font-bold">Sales</th>
                  <th className="px-4 py-2.5 font-bold">Delivery record</th>
                  <th className="px-4 py-2.5 text-center font-bold">Codes</th>
                  <th className="px-4 py-2.5 text-right font-bold">Points</th>
                  <th className="pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {result.vendors.map((vendor) => (
                  <VendorRow key={vendor.id} vendor={vendor} currency={currency} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[10px] text-[var(--foreground-muted)]">
        Points are the desk&rsquo;s standing, not a verdict: one point per hundred
        of plan money, one per thirty days bought, one per thousand sold, and the
        delivery record contributes its own percentage.
      </p>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2.5 shadow-2xs">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} shops
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => go({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
