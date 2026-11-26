"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Search, Ticket, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import type { Coupon, CouponDraft } from "@/types";
import {
  blankCouponDraft,
  couponDraftFrom,
  couponPayload,
  validateCouponDraft,
} from "@/lib/couponDraft";
import { createStoreCoupon, updateStoreCoupon } from "@/lib/action/coupons";
import { formatPrice } from "@/lib/currency";
import AppDatePicker from "@/components/shared/AppDatePicker";

/**
 * Writing one store-wide code.
 *
 * This is the desk that may narrow a discount by category as well as by product,
 * and name anything in the store — the seller's form cannot do either. The
 * numbers are still only an intention: the API prices the code at checkout from
 * its own prices, and it is what refuses a code aimed at a seller's row.
 */

export interface CouponCategoryOption {
  _id: string;
  name: string;
}

export interface CouponProductOption {
  _id: string;
  title: string;
  price: number;
  /** The product's category, so a category can select all its products. */
  categoryId?: string;
}

interface AdminCouponFormProps {
  /** Null means a brand new code. */
  coupon: Coupon | null;
  categories: CouponCategoryOption[];
  products: CouponProductOption[];
  /** What the products search box holds, kept in the URL so a refresh keeps it. */
  productSearch: string;
  currency: string;
  /** The picker is read on the server, so a search is a new URL, not a fetch. */
  onSearchProducts: (term: string) => void;
  onDone: () => void;
}

const inputClass =
  "h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35";
const labelClass =
  "mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]";
const hintClass = "mt-1 text-[10px] text-[var(--foreground-muted)]";

export default function AdminCouponForm({
  coupon,
  categories,
  products,
  productSearch,
  currency,
  onSearchProducts,
  onDone,
}: AdminCouponFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CouponDraft>(
    coupon ? couponDraftFrom(coupon) : blankCouponDraft()
  );
  const [term, setTerm] = useState(productSearch);
  const [categoryTerm, setCategoryTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const numberField =
    (key: keyof CouponDraft, fallback: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      set(key, Number.isFinite(raw) ? raw : fallback);
    };

  /**
   * The name of every product the code names.
   *
   * Two sources, in order of trust: the staff list reads the titles beside the
   * ids, and the picker page holds whatever was searched for. An id from neither
   * is shown as its tail rather than hidden, so the code can still be narrowed.
   */
  const productTitles = useMemo(() => {
    const map = new Map<string, string>();
    if (coupon && coupon.productNames.length === coupon.productIds.length) {
      coupon.productIds.forEach((id, index) => map.set(id, coupon.productNames[index]));
    }
    products.forEach((product) => map.set(product._id, product.title));
    return map;
  }, [coupon, products]);

  const chosenProducts = new Set(draft.productIds);
  const chosenCategories = new Set(draft.categoryIds);

  // The category list carries its own filter: with a store of this size the
  // right category is a search away, not a scroll, and several can be ticked.
  const filteredCategories = useMemo(() => {
    const q = categoryTerm.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((category) => category.name.toLowerCase().includes(q));
  }, [categories, categoryTerm]);

  // The whole catalogue is loaded, so product search is a local filter.
  const filteredProducts = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => product.title.toLowerCase().includes(q));
  }, [products, term]);

  // Whether every category the filter shows is already ticked.
  const allFilteredChosen =
    filteredCategories.length > 0 &&
    filteredCategories.every((category) => chosenCategories.has(category._id));

  // Ticking a category also ticks every product in it that is loaded here, so the
  // products show as selected. The category stays on the code too, so coverage
  // holds even for products the picker has not loaded.
  const toggleCategory = (id: string) => {
    const on = chosenCategories.has(id);
    const productIdsInCategory = products
      .filter((product) => product.categoryId === id)
      .map((product) => product._id);

    setDraft((prev) => ({
      ...prev,
      categoryIds: on ? prev.categoryIds.filter((value) => value !== id) : [...prev.categoryIds, id],
      productIds: on
        ? prev.productIds.filter((value) => !productIdsInCategory.includes(value))
        : Array.from(new Set([...prev.productIds, ...productIdsInCategory])),
    }));
  };

  // One click marks every category the filter shows (and their products);
  // clicking again takes them all off.
  const markAllCategories = () => {
    const ids = filteredCategories.map((category) => category._id);
    const productIdsInCategories = products
      .filter((product) => product.categoryId && ids.includes(product.categoryId))
      .map((product) => product._id);

    setDraft((prev) => ({
      ...prev,
      categoryIds: allFilteredChosen
        ? prev.categoryIds.filter((id) => !ids.includes(id))
        : Array.from(new Set([...prev.categoryIds, ...ids])),
      productIds: allFilteredChosen
        ? prev.productIds.filter((id) => !productIdsInCategories.includes(id))
        : Array.from(new Set([...prev.productIds, ...productIdsInCategories])),
    }));
  };

  const toggle = (key: "productIds" | "categoryIds", id: string) => {
    const current = draft[key];
    set(
      key,
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const problem = validateCouponDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);

    try {
      const res = coupon
        ? await updateStoreCoupon(coupon._id, couponPayload(draft))
        : await createStoreCoupon(couponPayload(draft));

      if (res?.success === false) {
        toast.error(res.message || "The code could not be saved");
        return;
      }

      toast.success(coupon ? "Coupon updated" : "Store code created");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const percent = draft.discountType === "percentage";
  const coversEverything = chosenProducts.size === 0 && chosenCategories.size === 0;

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
            <Ticket className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-[var(--foreground)]">
              {coupon ? `Editing ${coupon.code}` : "New store-wide code"}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {coupon
                ? "Changing a code that has already been used leaves the orders that quoted it untouched."
                : "Shoppers type this at checkout. It reaches anything in the store, a seller's goods included."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="rounded-lg p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="admin-coupon-code">
            Code
          </label>
          <input
            id="admin-coupon-code"
            value={draft.code}
            onChange={(event) => set("code", event.target.value.toUpperCase())}
            placeholder="STORE10"
            className={`${inputClass} font-mono uppercase tracking-widest`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="admin-coupon-title">
            Label for this board
          </label>
          <input
            id="admin-coupon-title"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Warehouse sale"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="admin-coupon-description">
          Note (only staff see this)
        </label>
        <input
          id="admin-coupon-description"
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Who asked for it, and what it was meant to do"
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <span className={labelClass}>Kind of discount</span>
          <div className="flex gap-1.5">
            {(["percentage", "fixed"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => set("discountType", choice)}
                className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-colors cursor-pointer ${
                  draft.discountType === choice
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "border border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {choice === "percentage" ? "%" : "Flat"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="admin-coupon-value">
            {percent ? "Percentage off" : "Amount off"}
          </label>
          <input
            id="admin-coupon-value"
            type="number"
            min={0}
            step={percent ? 1 : 0.01}
            value={draft.discountValue}
            onChange={numberField("discountValue", 0)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="admin-coupon-min">
            Minimum spend
          </label>
          <input
            id="admin-coupon-min"
            type="number"
            min={0}
            step={0.01}
            value={draft.minOrderAmount}
            onChange={numberField("minOrderAmount", 0)}
            className={inputClass}
          />
          <p className={hintClass}>0 means no minimum.</p>
        </div>
      </div>

      {percent && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="admin-coupon-cap">
              Largest discount
            </label>
            <input
              id="admin-coupon-cap"
              type="number"
              min={0}
              step={0.01}
              value={draft.maxDiscountAmount}
              onChange={numberField("maxDiscountAmount", 0)}
              className={inputClass}
            />
            <p className={hintClass}>
              {draft.maxDiscountAmount > 0
                ? `${formatPrice(draft.maxDiscountAmount, currency)} is the most this code can give on one order.`
                : "0 means the percentage is not capped."}
            </p>
          </div>

          <div className="flex items-end">
            <p className="rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              The share comes off the covered items only, never off the shipping
              fee — and a basket carries one code at a time, so this one is only
              spent when the shopper leaves theirs.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>
            Runs from
          </label>
          <AppDatePicker
            size="sm"
            withTime
            ariaLabel="Coupon start date and time"
            value={draft.startDate}
            onChange={(next) => set("startDate", next ?? "")}
          />
        </div>
        <div>
          <label className={labelClass}>
            Until
          </label>
          <AppDatePicker
            size="sm"
            withTime
            ariaLabel="Coupon end date and time"
            value={draft.endDate}
            onChange={(next) => set("endDate", next ?? "")}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="admin-coupon-total">
            Total uses
          </label>
          <input
            id="admin-coupon-total"
            type="number"
            min={0}
            step={1}
            value={draft.totalUsageLimit}
            onChange={numberField("totalUsageLimit", 0)}
            className={inputClass}
          />
          <p className={hintClass}>
            {draft.totalUsageLimit > 0
              ? `The code stops after ${draft.totalUsageLimit} order${draft.totalUsageLimit === 1 ? "" : "s"}.`
              : "0 means as many orders as want it."}
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="admin-coupon-per-customer">
            Uses per shopper
          </label>
          <input
            id="admin-coupon-per-customer"
            type="number"
            min={0}
            step={1}
            value={draft.perCustomerLimit}
            onChange={numberField("perCustomerLimit", 0)}
            className={inputClass}
          />
          <p className={hintClass}>
            {draft.perCustomerLimit > 0
              ? `Each account may use it ${draft.perCustomerLimit} time${draft.perCustomerLimit === 1 ? "" : "s"}.`
              : "0 means no limit per account."}
          </p>
        </div>
      </div>

      {/* Category narrowing: filter the list, then tick as many as the code covers. */}
      <div>
        <span className={labelClass}>Which categories</span>
        <p className={hintClass}>
          {chosenCategories.size === 0
            ? "None picked, so no category is covered by name."
            : `${chosenCategories.size} picked — covers your own store products in those categories (vendor products are excluded).`}
        </p>

        {categories.length === 0 ? (
          <p className="mt-2 rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-[10px] text-[var(--foreground-muted)]">
            The categories could not be read just now, so nothing can be picked by
            name. The code still covers products you name below.
          </p>
        ) : (
          <>
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
                <input
                  value={categoryTerm}
                  onChange={(event) => setCategoryTerm(event.target.value)}
                  placeholder="Filter categories"
                  className={`${inputClass} pl-9`}
                />
              </div>
              <button
                type="button"
                onClick={markAllCategories}
                disabled={filteredCategories.length === 0}
                className="whitespace-nowrap rounded-xl border border-[var(--border-color)] px-3 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {allFilteredChosen ? "Unselect all" : `Select all (${filteredCategories.length})`}
              </button>
            </div>

            <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-2">
              {filteredCategories.length === 0 ? (
                <p className="px-1.5 py-2 text-[10px] text-[var(--foreground-muted)]">
                  No category matches &ldquo;{categoryTerm}&rdquo;.
                </p>
              ) : (
                filteredCategories.map((category) => (
                  <label
                    key={category._id}
                    className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={chosenCategories.has(category._id)}
                      onChange={() => toggleCategory(category._id)}
                      className="h-3.5 w-3.5 accent-[var(--brand-flat)]"
                    />
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                  </label>
                ))
              )}
            </div>

            {chosenCategories.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {draft.categoryIds.map((id) => {
                  const name = categories.find((category) => category._id === id)?.name || `...${id.slice(-6)}`;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] px-2 py-1 text-[10px] text-[var(--foreground)]"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => toggle("categoryIds", id)}
                        className="text-[var(--foreground-muted)] hover:text-rose-600 cursor-pointer"
                        aria-label={`Take ${name} off the code`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Product narrowing: the whole catalogue is loaded, so this filters locally. */}
      <div>
        <span className={labelClass}>Which products</span>
        <p className={hintClass}>
          {coversEverything
            ? "Nothing named and no category picked, so the code covers everything in the store."
            : `${chosenProducts.size} named${
                chosenCategories.size > 0 ? `, plus ${chosenCategories.size} categor${chosenCategories.size === 1 ? "y" : "ies"}` : ""
              }.`}
        </p>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search the catalogue to name a product"
            className={`${inputClass} pl-9`}
          />
        </div>

        <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
          {filteredProducts.length} of {products.length} products · {chosenProducts.size} selected
        </p>

        {filteredProducts.length > 0 ? (
          <div className="mt-2 max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-2">
            {filteredProducts.map((product) => (
              <label
                key={product._id}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={chosenProducts.has(product._id)}
                  onChange={() => toggle("productIds", product._id)}
                  className="h-3.5 w-3.5 accent-[var(--brand-flat)]"
                />
                <span className="min-w-0 flex-1 truncate">{product.title}</span>
                <span className="shrink-0 text-[10px] text-[var(--foreground-muted)]">
                  {formatPrice(product.price, currency)}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="mt-2 rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-[10px] text-[var(--foreground-muted)]">
            No product matches &ldquo;{term}&rdquo;.
          </p>
        )}

        {chosenProducts.size > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.productIds.map((id) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] px-2 py-1 text-[10px] text-[var(--foreground)]"
              >
                {productTitles.get(id) || `…${id.slice(-6)}`}
                <button
                  type="button"
                  onClick={() => toggle("productIds", id)}
                  className="text-[var(--foreground-muted)] hover:text-rose-600 cursor-pointer"
                  aria-label={`Take ${productTitles.get(id) || "this product"} off the code`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)] cursor-pointer">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) => set("isActive", event.target.checked)}
          className="h-3.5 w-3.5 accent-[var(--brand-flat)]"
        />
        Live as soon as it starts
      </label>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3.5 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {coupon ? "Save changes" : "Create code"}
        </button>
      </div>
    </form>
  );
}
