import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleDashed,
  CreditCard,
  Layers,
  ShoppingBag,
  Store,
  Tag,
  Ticket,
  Trophy,
} from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asApplication, getMyVendorApplication } from "@/lib/api/vendor";
import { asStore, getMyStore } from "@/lib/api/vendorStore";
import { asSubscription, getMySubscription } from "@/lib/api/vendorSubscription";
import { asOrderSummary, getMyOrderSummary } from "@/lib/api/vendorOrders";
import { getSiteSettings } from "@/lib/api/siteSettings";
import { getVendorOrderFinancials } from "@/lib/api/financials";
import { getMyVendorPoints } from "@/lib/api/promotions";
import { formatOrderDate } from "@/lib/dateTime";
import { formatPrice } from "@/lib/currency";
import { isPaidPlan, planPrice } from "@/lib/vendorPlan";

export const dynamic = "force-dynamic";

/**
 * The vendor's home.
 *
 * Everything here is read from what the API already knows: the approved
 * application, the plan table, the seller's own order rows and the account
 * session. No counter is invented — the order board counts the same rows the
 * order screens list.
 */
export default async function VendorOverviewPage() {
  const user = await getRequiredRole("vendor");

  const [storeRes, application, subscriptionOverview, orderSummary, settingsRes, financeRes, pointsRes] = await Promise.all([
    getMyStore().then(asStore).catch(() => null),
    getMyVendorApplication().then(asApplication).catch(() => null),
    getMySubscription().then(asSubscription).catch(() => null),
    getMyOrderSummary().then(asOrderSummary).catch(() => null),
    getSiteSettings(),
    // The same per-order financials the seller's breakdown modal shows; a free
    // plan is refused by the API, so this simply resolves to null and the cards
    // stay hidden rather than showing a guessed number.
    getVendorOrderFinancials({ days: 30, limit: 1 }).catch(() => null),
    // Points: plan awards plus sell points, and the shop's position. The same
    // ledger every store-team screen reads.
    getMyVendorPoints().catch(() => null),
  ]);

  const currency = settingsRes?.data?.currency;
  const plan = subscriptionOverview?.plan ?? null;
  const billingCycle = subscriptionOverview?.subscription?.billingCycle || "monthly";
  const usage = subscriptionOverview?.usage;
  const planIsLive = subscriptionOverview?.isLive ?? false;
  const approvedAt = application?.reviewedAt || application?.submittedAt;
  const appStore = application?.storeInfo;
  const store = storeRes ?? appStore;
  const coverImage = storeRes?.coverImage || appStore?.coverImage || "";
  const logo = storeRes?.logo || appStore?.logo || "";
  const storeName = storeRes?.name || appStore?.name || user.name || "Your store";
  const storeSlug = storeRes?.slug || appStore?.slug || "—";
  const address = application?.businessAddress;

  const planPriceLabel = plan
    ? isPaidPlan(plan)
      ? `${formatPrice(planPrice(plan, billingCycle), currency)} / ${billingCycle === "yearly" ? "year" : "month"}`
      : "Free"
    : "—";

  // The profile checklist is derived from real fields, so a tick always means
  // the store actually has that information.
  const readiness = [
    { label: "Store description", done: Boolean(store?.description) },
    { label: "Store logo", done: Boolean(logo) },
    { label: "Cover image", done: Boolean(coverImage) },
    { label: "Business address", done: Boolean(address?.address && address?.city) },
    { label: "Verification document", done: Boolean(application?.verification?.documentUrl) },
  ];
  const completed = readiness.filter((item) => item.done).length;

  return (
    <div className="space-y-5">
      {/* Store header with cover image just like profile page */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {/* The band follows the recommended 3:1 cover (1200×400), so an
            uploaded-at-size image fills it exactly instead of being cropped. */}
        <div className="relative flex aspect-[3/1] items-center justify-center bg-brand-gradient">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--on-grad-text)]/80">
              Cover image
            </span>
          )}
        </div>
        {/* This block has to be positioned: the cover band above it is
            `relative`, and a positioned sibling paints over in-flow content,
            so without `relative` here the lifted logo would slide behind the
            image instead of sitting on top of it. */}
        <div className="relative px-5 pb-5">
          {/* Only the logo is lifted over the cover; the store name sits below
              the band so the image never covers it. */}
          <div className="relative z-10 -mt-10 w-fit">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--surface-elevated)] bg-[var(--surface-alt)] text-[var(--brand-flat)] shadow-md">
              {logo ? (
                // The logo is a URL the applicant supplied; next/image would
                // need every host configured, so this stays a plain image.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt={storeName} className="h-full w-full object-contain p-1.5" />
              ) : (
                <Store className="h-6 w-6" />
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-[var(--foreground)]">
                {storeName}
              </h1>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                /store/{storeSlug}
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
              <BadgeCheck className="h-3 w-3" />
              Approved vendor
            </span>
          </div>
        </div>
      </section>

      {/* Three facts */}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Plan
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
            <Layers className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            {plan?.name || "—"}
            {!planIsLive && plan && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                Inactive
              </span>
            )}
          </p>
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">{planPriceLabel}</p>
        </article>

        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Vendor since
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
            <CreditCard className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            {formatOrderDate(approvedAt) || "—"}
          </p>
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
            Same account as your customer profile
          </p>
        </article>

        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Reference
          </p>
          <p className="mt-1 font-mono text-xs font-bold text-[var(--foreground)]">
            {application?.reference || "—"}
          </p>
          <Link
            href="/become-a-vendor/status"
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-flat)] hover:underline"
          >
            Application history
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </article>
      </section>

      {/* Live work */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
            <ShoppingBag className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            Orders
          </h2>
          <Link
            href="/dashboard/vendor/orders"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-flat)] hover:underline"
          >
            Open the order board
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "New", value: orderSummary?.pending ?? 0, urgent: true },
            { label: "In progress", value: orderSummary?.active ?? 0, urgent: false },
            { label: "Completed", value: orderSummary?.completed ?? 0, urgent: false },
            { label: "All orders", value: orderSummary?.total ?? 0, urgent: false },
          ].map((counter) => (
            <div
              key={counter.label}
              className={`rounded-xl border px-3 py-2 ${
                counter.urgent && counter.value > 0
                  ? "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10"
                  : "border-[var(--border-color)] bg-[var(--surface)]"
              }`}
            >
              <p className="text-base font-bold text-[var(--foreground)]">{counter.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                {counter.label}
              </p>
            </div>
          ))}
        </div>

        {/* Revenue and profit/loss — the same figures the order breakdown shows */}
        {financeRes?.summary && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
              <p className="text-base font-bold text-[var(--foreground)]">
                {formatPrice(financeRes.summary.totalCustomerPaid, currency)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Revenue (30d)
              </p>
            </div>
            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
              <p
                className={`text-base font-bold ${
                  financeRes.summary.totalProfitWithDiscounts >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {formatPrice(financeRes.summary.totalProfitWithDiscounts, currency)}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Profit / Loss (30d)
              </p>
            </div>
          </div>
        )}

        {/* Points — the same plan + sell split every store-team screen reads */}
        {pointsRes && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
            <div>
              <p className="text-base font-bold text-[var(--foreground)]">
                {pointsRes.totalPoints.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                Points · {pointsRes.sellPoints.toLocaleString()} sold · {pointsRes.planPoints.toLocaleString()} plan
              </p>
            </div>
            {pointsRes.position <= 3 ? (
              <span
                className={`shrink-0 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${
                  pointsRes.position === 1
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : pointsRes.position === 2
                      ? "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      : "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                }`}
              >
                <Trophy className="h-3 w-3" /> #{pointsRes.position} of {pointsRes.totalVendors}
              </span>
            ) : (
              <span className="shrink-0 rounded-md bg-[var(--surface-alt)] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                #{pointsRes.position} of {pointsRes.totalVendors}
              </span>
            )}
          </div>
        )}

        {(orderSummary?.pending ?? 0) > 0 && (
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
            A new order waits for an answer. Accepting keeps the customer&apos;s delivery on
            schedule.
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Plan limits */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--foreground)]">What your plan allows</h2>
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-flat)] hover:underline"
            >
              Manage plan
              <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>

          <ul className="mt-3 space-y-2.5">
            {[
              {
                icon: Layers,
                label: "Active products",
                value: `${usage?.products ?? 0} / ${plan?.maxProducts ?? 0}`,
              },
              {
                icon: Ticket,
                label: "Active coupons",
                value: `${usage?.activeCoupons ?? 0} / ${plan?.activeCoupons ?? 0}`,
              },
              {
                icon: Tag,
                label: "Featured products",
                value: `${usage?.featuredProducts ?? 0} / ${plan?.featuredProducts ?? 0}`,
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <li
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
                    {row.label}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--foreground)]">
                    {row.value}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
            {planIsLive
              ? "Limits are counted from approved listings only. Archiving a product frees a slot immediately."
              : "Your period is not active, so publishing is on hold. Everything you already have is kept — renew from Plan & billing to publish again."}
          </p>
        </section>

        {/* Profile readiness */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--foreground)]">Store profile</h2>
            <span className="text-[10px] font-semibold text-[var(--foreground-muted)]">
              {completed} of {readiness.length} done
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all"
              style={{ width: `${Math.round((completed / readiness.length) * 100)}%` }}
            />
          </div>

          <ul className="mt-3 space-y-2">
            {readiness.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-[11px]">
                {item.done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CircleDashed className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-muted)]" />
                )}
                <span
                  className={
                    item.done
                      ? "text-[var(--foreground-muted)] line-through"
                      : "text-[var(--foreground)]"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/dashboard/vendor/profile"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
          >
            Open store profile
            <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      </div>

      {/* Points history — where and when every point was earned. */}
      {pointsRes && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-[var(--foreground)]">Points history</h2>
              <p className="text-[10px] text-[var(--foreground-muted)]">
                Every plan period and every delivered unit behind your total.
              </p>
            </div>
            <span className="rounded-md bg-[var(--surface-alt)] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {pointsRes.totalPoints.toLocaleString()} total
            </span>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {/* Plan periods: the permanent award ledger, newest first. */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                From plan periods · {pointsRes.planPoints.toLocaleString()}
              </p>
              {pointsRes.history.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-[var(--border-color)] px-3 py-4 text-[11px] text-[var(--foreground-muted)]">
                  No plan period has awarded points yet. Your first period will open the ledger.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {pointsRes.history.map((award) => (
                    <li
                      key={award.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-[var(--foreground)]">
                          {award.note || `${award.plan} ${award.billingCycle} period`}
                        </p>
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          {formatOrderDate(award.awardedAt) || "—"} · {award.billingCycle}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        +{award.points.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Delivered units: the sell half, and what sold. */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                From delivered units · {pointsRes.sellPoints.toLocaleString()}
              </p>
              <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-[var(--foreground)]">
                    {pointsRes.soldUnits.toLocaleString()} unit{pointsRes.soldUnits === 1 ? "" : "s"} delivered
                  </p>
                  <p className="text-[10px] text-[var(--foreground-muted)]">
                    {pointsRes.perUnit} point{pointsRes.perUnit === 1 ? "" : "s"} per unit
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  +{pointsRes.sellPoints.toLocaleString()}
                </span>
              </div>

              {pointsRes.products.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {pointsRes.products.map((product) => (
                    <li
                      key={product.productId}
                      className="flex items-center justify-between gap-3 px-1 text-[10px] text-[var(--foreground-muted)]"
                    >
                      <span className="truncate">{product.title}</span>
                      <span className="shrink-0 font-semibold text-[var(--foreground)]">
                        {product.units} × {pointsRes.perUnit} = {product.points.toLocaleString()} pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
