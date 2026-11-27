"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Input, Button, Select, ListBox, Switch } from "@heroui/react";
import {
  ArrowLeft,
  Check,
  FolderTree,
  Link2,
  Package,
  Search,
  SlidersHorizontal,
  Store,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import AppSelect from "@/components/shared/AppSelect";
import { addBanner, updateBanner } from "@/lib/action/banners";
import { normalizeImageUrl } from "@/lib/imageUrl";
import type { Banner, BannerType } from "@/types/banner";

export interface ProductLite {
  id?: string;
  _id?: string;
  title: string;
  sku?: string;
  brand?: string;
  /** How many of the listing have sold, for the picker's note. */
  sellCount?: number;
  /** The seller behind the listing, so its vendor points can be shown. */
  vendorId?: string;
}

export interface CategoryLite {
  id?: string;
  _id?: string;
  name: string;
  slug?: string;
}

export interface StoreLite {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  /** The seller account, so its vendor points can be shown. */
  userId?: string;
}

interface HeroBannerFormProps {
  mode: "create" | "edit";
  initialBanner?: Banner;
  defaultOrder?: number;
  products: ProductLite[];
  categories: CategoryLite[];
  stores: StoreLite[];
  /** Each seller's active plan and vendor points, for the picker notes. */
  vendorPlans?: Record<string, { plan: string; points: number }>;
}

const TYPE_OPTIONS: { value: BannerType; label: string; icon: typeof Package }[] = [
  { value: "product", label: "Product Promotion", icon: Package },
  { value: "category", label: "Category Promotion", icon: FolderTree },
  { value: "vendor", label: "Vendor Spotlight", icon: Store },
  { value: "custom", label: "Custom Promotion", icon: Link2 },
];

const idOf = (row: { id?: string; _id?: string }) => String(row.id || row._id || "");

export default function HeroBannerForm({
  mode,
  initialBanner,
  defaultOrder = 0,
  products = [],
  categories = [],
  stores = [],
  vendorPlans = {},
}: HeroBannerFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(initialBanner);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetSearch, setTargetSearch] = useState("");
  // The picker's order. Points lead by default, so the highest-value shops and
  // listings come first; name and plan are there when the admin is hunting.
  const [targetSort, setTargetSort] = useState<"points" | "name" | "plan">("points");
  const [form, setForm] = useState({
    title: initialBanner?.title || "",
    subtitle: initialBanner?.subtitle || "",
    type: (initialBanner?.type || "product") as BannerType,
    desktopImage: initialBanner?.desktopImage || "",
    mobileImage: initialBanner?.mobileImage || "",
    ctaText: initialBanner?.ctaText || "Shop Now",
    productId: initialBanner?.target?.productId || "",
    categoryId: initialBanner?.target?.categoryId || "",
    vendorId: initialBanner?.target?.vendorId || "",
    customUrl: initialBanner?.target?.customUrl || "",
    order: initialBanner?.order ?? defaultOrder,
    startDate: initialBanner?.startDate || "",
    endDate: initialBanner?.endDate || "",
    isActive: initialBanner?.isActive ?? false,
  });

  const set = (patch: Partial<typeof form>) => setForm((prev) => ({ ...prev, ...patch }));

  // Build unified searchable options for the active target type
  const targetOptions = useMemo(() => {
    if (form.type === "product") {
      return products.map((p) => ({
        id: idOf(p),
        label: p.title,
        meta: [
          p.sku,
          p.brand,
          p.sellCount != null ? `${p.sellCount} sold` : "",
          p.vendorId && vendorPlans[p.vendorId]
            ? `${vendorPlans[p.vendorId].plan} · ${vendorPlans[p.vendorId].points} pts`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
        points: p.vendorId ? vendorPlans[p.vendorId]?.points ?? 0 : 0,
        plan: p.vendorId ? vendorPlans[p.vendorId]?.plan ?? "" : "",
      }));
    }
    if (form.type === "category") {
      return categories.map((c) => ({
        id: idOf(c),
        label: c.name,
        meta: c.slug || "",
        points: 0,
        plan: "",
      }));
    }
    if (form.type === "vendor") {
      return stores.map((s) => ({
        id: idOf(s),
        label: s.name,
        meta: [
          s.slug ? `@${s.slug}` : "",
          s.userId && vendorPlans[s.userId]
            ? `${vendorPlans[s.userId].plan} · ${vendorPlans[s.userId].points} pts`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
        points: s.userId ? vendorPlans[s.userId]?.points ?? 0 : 0,
        plan: s.userId ? vendorPlans[s.userId]?.plan ?? "" : "",
      }));
    }
    return [];
  }, [form.type, products, categories, stores, vendorPlans]);

  const selectedTargetId =
    form.type === "product"
      ? form.productId
      : form.type === "category"
      ? form.categoryId
      : form.vendorId;

  const selectedTargetOption = useMemo(
    () => targetOptions.find((o) => o.id === selectedTargetId) || null,
    [targetOptions, selectedTargetId]
  );

  const filteredTargetOptions = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    const list = q
      ? targetOptions.filter(
          (opt) => opt.label.toLowerCase().includes(q) || opt.meta.toLowerCase().includes(q)
        )
      : targetOptions;
    const sorted = [...list];
    if (targetSort === "plan") {
      sorted.sort(
        (a, b) =>
          String(a.plan || "").localeCompare(String(b.plan || "")) ||
          (b.points ?? 0) - (a.points ?? 0)
      );
    } else if (targetSort === "name") {
      sorted.sort((a, b) => a.label.localeCompare(b.label));
    } else {
      sorted.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    }
    return sorted;
  }, [targetOptions, targetSearch, targetSort]);

  const selectTarget = (id: string) => {
    if (form.type === "product") set({ productId: id });
    else if (form.type === "category") set({ categoryId: id });
    else if (form.type === "vendor") set({ vendorId: id });
  };

  const targetNoun =
    form.type === "product"
      ? "product"
      : form.type === "category"
      ? "category"
      : "vendor";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) return toast.error("Banner title is required");
    if (!form.desktopImage) return toast.error("Upload a desktop banner image");
    if (form.type === "product" && !form.productId) return toast.error("Select a product");
    if (form.type === "category" && !form.categoryId) return toast.error("Select a category");
    if (form.type === "vendor" && !form.vendorId) return toast.error("Select a vendor");
    if (form.type === "custom" && !form.customUrl.trim()) return toast.error("Enter a destination URL");

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        type: form.type,
        desktopImage: normalizeImageUrl(form.desktopImage),
        mobileImage: normalizeImageUrl(form.mobileImage),
        ctaText: form.ctaText.trim() || "Shop Now",
        order: Number(form.order) || 0,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        isActive: form.isActive,
        productId: form.type === "product" ? form.productId : undefined,
        categoryId: form.type === "category" ? form.categoryId : undefined,
        vendorId: form.type === "vendor" ? form.vendorId : undefined,
        customUrl: form.type === "custom" ? form.customUrl.trim() : undefined,
      };

      const res =
        isEdit && initialBanner
          ? await updateBanner(initialBanner.id, payload)
          : await addBanner(payload);

      if (res?.success === false) {
        toast.error(res?.message || "Could not save the banner");
        return;
      }

      toast.success(isEdit ? "Banner updated" : "Banner created");
      router.push("/dashboard/admin/hero-banners");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard/admin/hero-banners" className="hover:text-primary transition-colors">
              Hero Banners
            </Link>
            <span>/</span>
            <span className="text-primary">{isEdit ? "Edit Banner" : "Add Banner"}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-primary" />
            {isEdit ? "Edit Hero" : "Add Hero"} <span className="text-primary">Banner</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Upload the artwork, search and pick a target, schedule it, and publish.
          </p>
        </div>

        <Link
          href="/dashboard/admin/hero-banners"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--surface-alt)] text-xs font-semibold transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Hero Banners</span>
        </Link>
      </div>

      {/* Form Card */}
      <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--foreground)]">
              Banner Type <span className="text-rose-500">*</span>
            </label>
            <Select
              selectedKey={form.type}
              onSelectionChange={(key) => {
                set({ type: String(key) as BannerType });
                setTargetSearch("");
              }}
              placeholder="Choose a type"
            >
              <Select.Trigger className="w-full cursor-pointer bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {TYPE_OPTIONS.map((opt) => (
                    <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label} className="cursor-pointer py-2">
                      <span className="flex items-center gap-2 text-xs font-medium">
                        <opt.icon className="w-3.5 h-3.5 text-primary" />
                        {opt.label}
                      </span>
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Searchable Target Picker */}
          {form.type !== "custom" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[var(--foreground)] capitalize">
                  {targetNoun} <span className="text-rose-500">*</span>
                </label>
                {selectedTargetOption && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                    <Check className="w-3 h-3" />
                    Selected: {selectedTargetOption.label}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
                <Input
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder={`Search ${targetNoun}s by name${form.type === "product" ? ", SKU, or brand" : ""}...`}
                  className="w-full pl-9 pr-9 h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs"
                />
                {targetSearch && (
                  <button
                    type="button"
                    onClick={() => setTargetSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {form.type !== "category" && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Sort
                  </span>
                  <AppSelect
                    value={targetSort}
                    onChange={(v) => setTargetSort(v as "points" | "name" | "plan")}
                    options={[
                      { value: "points", label: "Vendor points (high to low)" },
                      { value: "name", label: "Name (A-Z)" },
                      { value: "plan", label: "Plan" },
                    ]}
                    size="sm"
                    ariaLabel="Sort the picker"
                  />
                </div>
              )}

              <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]/50 divide-y divide-[var(--border-color)]/60">
                {filteredTargetOptions.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--foreground-muted)]">
                    No matching {targetNoun}s found.
                  </p>
                ) : (
                  filteredTargetOptions.map((opt) => {
                    const isSelected = opt.id === selectedTargetId;
                    return (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => selectTarget(opt.id)}
                        className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-[var(--foreground)] hover:bg-[var(--surface-alt)]"
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate">{opt.label}</p>
                          {opt.meta && (
                            <p className="text-[10px] text-[var(--foreground-muted)] truncate">
                              {opt.meta}
                            </p>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-[var(--foreground-muted)]">
                Showing {filteredTargetOptions.length} of {targetOptions.length} {targetNoun}s
              </p>
            </div>
          )}

          {/* Custom URL */}
          {form.type === "custom" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Destination URL <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.customUrl}
                onChange={(e) => set({ customUrl: e.target.value })}
                placeholder="https://example.com/seasonal-offer"
                className="w-full bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs"
              />
            </div>
          )}

          {/* Images */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageUploader
              label="Desktop Banner Image"
              value={form.desktopImage}
              onChange={(url) => set({ desktopImage: normalizeImageUrl(url) })}
              required
              hint="Recommended: 1920 × 900 px (~2.13:1) to fit the hero. PNG, JPG, WEBP or GIF."
            />
            <ImageUploader
              label="Mobile Banner Image (optional)"
              value={form.mobileImage}
              onChange={(url) => set({ mobileImage: normalizeImageUrl(url) })}
              hint="Recommended: 960 × 540 px (16:9) for phones. Falls back to the desktop image."
            />
          </div>

          {/* Title / Subtitle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Banner Title <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Eid Mega Sale"
                className="w-full rounded-xl text-xs bg-[var(--surface-alt)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Subtitle / Description
              </label>
              <Input
                value={form.subtitle}
                onChange={(e) => set({ subtitle: e.target.value })}
                placeholder="e.g. Up to 40% off electronics"
                className="w-full rounded-xl text-xs bg-[var(--surface-alt)]"
              />
            </div>
          </div>

          {/* CTA + order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                CTA Button Text
              </label>
              <Input
                value={form.ctaText}
                onChange={(e) => set({ ctaText: e.target.value })}
                placeholder="Shop Now"
                className="w-full rounded-xl text-xs bg-[var(--surface-alt)]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground)]">
                Display Order
              </label>
              <Input
                type="number"
                min={0}
                value={String(form.order)}
                onChange={(e) => set({ order: parseInt(e.target.value) || 0 })}
                className="w-full rounded-xl text-xs font-mono bg-[var(--surface-alt)]"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HeroUIDateTimePicker
              label="Start Date & Time"
              value={form.startDate || null}
              onChange={(iso) => set({ startDate: iso })}
              helperText="Leave empty to start immediately."
              showPresets={false}
            />
            <HeroUIDateTimePicker
              label="End Date & Time"
              value={form.endDate || null}
              onChange={(iso) => set({ endDate: iso })}
              helperText="Leave empty to run until you stop it."
            />
          </div>

          {/* Publish */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]/60">
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Publish on homepage</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">
                Off saves it as a draft. A future start date shows it as scheduled.
              </p>
            </div>
            <Switch
              isSelected={form.isActive}
              onChange={(val) => set({ isActive: val })}
              className="cursor-pointer"
            >
              <Switch.Content className="cursor-pointer">
                <Switch.Control className="cursor-pointer">
                  <Switch.Thumb className="cursor-pointer" />
                </Switch.Control>
              </Switch.Content>
            </Switch>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <Link
              href="/dashboard/admin/hero-banners"
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              isDisabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "Saving..." : isEdit ? "Update Banner" : "Create Banner"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
