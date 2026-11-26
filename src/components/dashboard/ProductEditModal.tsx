"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Modal, Input, TextArea, Switch, Button } from "@heroui/react";
import { Plus, X, Shield, Info, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import AppSelect from "@/components/shared/AppSelect";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { recalcPricing } from "@/lib/pricing";
import { WARRANTY_TYPE_OPTIONS } from "@/lib/warranty";
import { hasOfferDiscount } from "@/lib/offer";
import { hasBrandSpec } from "@/lib/productSpecs";
import type { Category, SubCategory } from "@/types";

/** One editable row of the technical-specifications table. */
interface SpecRow {
  key: string;
  value: string;
}

/**
 * The product edit modal, shared by the store team and the seller.
 *
 * Both dashboards edit the same listing, so they must offer the same fields —
 * a seller who cannot set a warranty or a specification here would have a
 * different product from the one the admin sees. The only differences are the
 * two controls the seller's backend derives for them: the In-Stock switch (the
 * seller's stock count drives it) and the featured-placement note (bought from
 * the promotions desk, not set here).
 */
export interface EditableProduct {
  id?: string;
  _id?: string;
  title: string;
  slug?: string;
  price?: number;
  originalPrice?: number | null;
  storedPrice?: number | null;
  storedOriginalPrice?: number | null;
  investPrice?: number | null;
  stockQuantity?: number | null;
  inStock?: boolean;
  sku?: string;
  brand?: string;
  description?: string;
  image?: string;
  additionalImages?: string[];
  categoryId?: unknown;
  categories?: string[];
  subCategoryIds?: unknown[];
  specifications?: Record<string, string>;
  warrantyPeriodMonths?: number;
  warrantyType?: string;
  warrantyTerms?: string;
  offerEndDate?: string | Date | null;
  offerEndsAt?: string | Date | null;
  isFeatured?: boolean;
}

export interface ProductEditPayload {
  title: string;
  slug?: string;
  price: number;
  originalPrice?: number;
  investPrice?: number;
  discountPercentage?: number;
  stockQuantity: number | null;
  sku?: string;
  brand?: string;
  description?: string;
  image: string;
  additionalImages: string[];
  categoryId?: string;
  subCategoryIds: string[];
  inStock: boolean;
  warrantyPeriodMonths?: number;
  warrantyType: string;
  warrantyTerms?: string;
  offerEndDate: string | null;
  specifications: Record<string, string>;
}

interface ProductEditModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** The listing being edited; the form fills itself from this when it opens. */
  product: EditableProduct | null;
  categories: Category[];
  subcategories: SubCategory[];
  /** `vendor` hides the two controls the seller's backend derives. */
  mode?: "admin" | "vendor";
  /** Persists the payload; resolve with `success: false` to keep the modal open. */
  onSave: (
    productId: string,
    payload: ProductEditPayload
  ) => Promise<{ success?: boolean; message?: string } | void>;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ProductEditModal({
  isOpen,
  onOpenChange,
  product,
  categories,
  subcategories,
  mode = "admin",
  onSave,
}: ProductEditModalProps) {
  const { currencySymbol } = useSiteSettings();
  const isVendor = mode === "vendor";

  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    slug: "",
    price: "",
    originalPrice: "",
    investPrice: "",
    discountPercentage: "",
    stockQuantity: "",
    sku: "",
    brand: "",
    description: "",
    image: "",
    additionalImages: [] as string[],
    categoryId: "",
    subCategoryIds: new Set<string>(),
    inStock: true,
    warrantyPeriodMonths: "",
    warrantyType: "none",
    warrantyTerms: "",
    offerEndDate: "",
  });
  const [editSpecs, setEditSpecs] = useState<SpecRow[]>([]);
  const [editBaseline, setEditBaseline] = useState({ price: 0, offerLapsed: false });

  const editAvailableSubCategories = useMemo(() => {
    if (!editForm.categoryId) return [];
    return subcategories.filter(
      (sub) =>
        (sub.categoryId as unknown) === editForm.categoryId ||
        String(sub.categoryId) === String(editForm.categoryId)
    );
  }, [editForm.categoryId, subcategories]);

  // Fill the form from the listing each time the modal opens.
  useEffect(() => {
    if (!isOpen || !product) return;

    const id = product.id || product._id || "";
    let catId = "";
    if (product.categoryId) {
      if (typeof product.categoryId === "object" && (product.categoryId as any)._id) {
        catId = (product.categoryId as any)._id;
      } else if (typeof product.categoryId === "string") {
        catId = product.categoryId;
      } else {
        const found = categories.find(
          (c) =>
            c.name === (product.categoryId as any)?.name || c.slug === (product.categoryId as any)?.slug
        );
        if (found) catId = (found._id || found.id || found.slug) as string;
      }
    }
    if (!catId && product.categories?.length) {
      const found = categories.find((c) => product.categories!.includes(c.name));
      if (found) catId = (found._id || found.id || found.slug) as string;
    }

    const subSet = new Set<string>();
    if (Array.isArray(product.subCategoryIds)) {
      product.subCategoryIds.forEach((s: any) => {
        if (typeof s === "string") subSet.add(s);
        else if (s?._id) subSet.add(s._id);
        else if (s?.id) subSet.add(s.id);
      });
    }

    const specs: SpecRow[] = [];
    if (product.specifications && typeof product.specifications === "object") {
      Object.entries(product.specifications).forEach(([k, v]) => specs.push({ key: k, value: String(v) }));
    }
    if (specs.length === 0) specs.push({ key: "", value: "" });

    // The form edits what is stored, never the effective price on screen: a
    // lapsed offer reverts the display price, and saving that would raise it.
    const storedPrice = product.storedPrice ?? product.price;
    const storedOriginalPrice = product.storedOriginalPrice ?? product.originalPrice;
    const storedDiscount = recalcPricing(
      {
        price: storedPrice != null ? String(storedPrice) : "",
        originalPrice: storedOriginalPrice != null ? String(storedOriginalPrice) : "",
        discountPercentage: "",
      },
      "price"
    ).discountPercentage;

    const offerDeadline = product.offerEndsAt ?? product.offerEndDate;
    const offerDeadlineMs = offerDeadline ? new Date(offerDeadline).getTime() : NaN;
    const offerDeadlineValue = Number.isFinite(offerDeadlineMs)
      ? new Date(offerDeadlineMs).toISOString()
      : "";

    setEditBaseline({
      price: typeof product.price === "number" ? product.price : 0,
      offerLapsed: Number.isFinite(offerDeadlineMs) && offerDeadlineMs <= Date.now(),
    });

    setEditForm({
      title: product.title || "",
      slug: product.slug || "",
      price: storedPrice != null ? String(storedPrice) : "",
      originalPrice: storedOriginalPrice != null ? String(storedOriginalPrice) : "",
      investPrice: product.investPrice != null ? String(product.investPrice) : "",
      discountPercentage: storedDiscount,
      stockQuantity: product.stockQuantity != null ? String(product.stockQuantity) : "",
      sku: product.sku || "",
      brand: product.brand || "",
      description: product.description || "",
      image: product.image || "",
      additionalImages: product.additionalImages || [],
      categoryId: catId,
      subCategoryIds: subSet,
      inStock: product.inStock ?? true,
      warrantyPeriodMonths:
        product.warrantyPeriodMonths != null ? String(product.warrantyPeriodMonths) : "",
      warrantyType: product.warrantyType || "none",
      warrantyTerms: product.warrantyTerms || "",
      offerEndDate: offerDeadlineValue,
    });
    setEditSpecs(specs);
    // `id` is only read to keep the linter aware the row is the one being edited.
    void id;
  }, [isOpen, product, categories]);

  const hasEditPositiveStock = useMemo(() => {
    const qty = parseInt(editForm.stockQuantity, 10);
    return !isNaN(qty) && qty > 0;
  }, [editForm.stockQuantity]);

  const editStockTracked = useMemo(
    () => editForm.stockQuantity.trim() !== "" && !isNaN(parseInt(editForm.stockQuantity, 10)),
    [editForm.stockQuantity]
  );

  const hasEditDiscount = hasOfferDiscount(editForm.price, editForm.originalPrice);

  const handleEditPriceChange = (newPrice: string, newOriginalPrice: string) => {
    setEditForm((prev) => ({
      ...prev,
      ...recalcPricing(
        { price: newPrice, originalPrice: newOriginalPrice, discountPercentage: prev.discountPercentage },
        "price"
      ),
    }));
  };

  const handleEditDiscountChange = (newDiscount: string) => {
    setEditForm((prev) => ({
      ...prev,
      ...recalcPricing(
        { price: prev.price, originalPrice: prev.originalPrice, discountPercentage: newDiscount },
        "discountPercentage"
      ),
    }));
  };

  const handleSave = async () => {
    if (!product) return;
    const id = product.id || product._id || "";
    if (!id) return;
    if (!editForm.title.trim()) {
      toast.error("Product title is required.");
      return;
    }
    if (!editForm.price || Number(editForm.price) <= 0) {
      toast.error("Valid selling price is required.");
      return;
    }
    if (!editForm.image) {
      toast.error("Primary thumbnail image is required.");
      return;
    }

    // A warranty is optional. An empty period means the seller has nothing to
    // say about a warranty, so the product is saved as No warranty rather than
    // blocked. Only a real period has to agree with its type.
    const warrantyMonths = parseInt(editForm.warrantyPeriodMonths || "0", 10) || 0;
    const wantsWarranty = warrantyMonths > 0 && editForm.warrantyType !== "none";

    if (wantsWarranty && editForm.warrantyType === "other" && !editForm.warrantyTerms.trim()) {
      toast.error("Describe the coverage in Warranty Terms for an Other warranty.");
      return;
    }

    const specObj: Record<string, string> = {};
    editSpecs.forEach((s) => {
      if (s.key.trim() && s.value.trim()) specObj[s.key.trim()] = s.value.trim();
    });
    if (
      wantsWarranty &&
      editForm.warrantyType === "manufacturer-warranty" &&
      !hasBrandSpec(specObj) &&
      !editForm.brand.trim()
    ) {
      toast.error(
        "Add the brand in the Brand field or Specifications — a manufacturer warranty is claimed from the brand."
      );
      return;
    }

    setIsUpdating(true);
    const deadlineMs = editForm.offerEndDate ? new Date(editForm.offerEndDate).getTime() : NaN;
    const renewedOffer = Number.isFinite(deadlineMs) && deadlineMs > Date.now();
    const endsLapsedOffer = editBaseline.offerLapsed && !renewedOffer;

    const payload: ProductEditPayload = {
      title: editForm.title,
      slug: editForm.slug || generateSlug(editForm.title),
      price: endsLapsedOffer ? editBaseline.price : parseFloat(editForm.price) || 0,
      originalPrice: editForm.originalPrice ? parseFloat(editForm.originalPrice) : undefined,
      investPrice: editForm.investPrice ? parseFloat(editForm.investPrice) : undefined,
      discountPercentage: editForm.discountPercentage ? parseFloat(editForm.discountPercentage) : undefined,
      stockQuantity: editStockTracked ? parseInt(editForm.stockQuantity, 10) : null,
      sku: editForm.sku || undefined,
      brand: editForm.brand || undefined,
      description: editForm.description || undefined,
      image: editForm.image,
      additionalImages: editForm.additionalImages,
      categoryId: editForm.categoryId || undefined,
      subCategoryIds: Array.from(editForm.subCategoryIds),
      inStock: hasEditPositiveStock ? true : editForm.inStock,
      warrantyPeriodMonths: wantsWarranty ? warrantyMonths : undefined,
      warrantyType: wantsWarranty ? editForm.warrantyType : "none",
      warrantyTerms: wantsWarranty ? editForm.warrantyTerms.trim() || undefined : undefined,
      offerEndDate: renewedOffer && hasEditDiscount ? new Date(deadlineMs).toISOString() : null,
      specifications: specObj,
    };

    try {
      const res = await onSave(id, payload);
      if (res?.success !== false) onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error saving product");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
            <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <Modal.Heading className="text-lg font-extrabold text-[var(--foreground)]">
                  Edit Product
                </Modal.Heading>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Update pricing, stock, media, warranty and specifications.
                </p>
              </div>
              <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg">
                ✕
              </Modal.CloseTrigger>
            </Modal.Header>

            <div className="space-y-6">
              {/* 1. Core Info */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Basic Info</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">Title *</label>
                    <Input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditForm((prev) => ({ ...prev, title: val, slug: generateSlug(val) }));
                      }}
                      placeholder="Product title"
                      required
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">URL Slug *</label>
                    <Input
                      type="text"
                      value={editForm.slug}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="product-slug"
                      required
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                    SKU (Stock Keeping Unit)
                  </label>
                  <Input
                    type="text"
                    value={editForm.sku}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                    placeholder="e.g. ELEC-PROD-001"
                    className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-mono"
                  />
                </div>

                {isVendor && (
                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">Brand</label>
                    <Input
                      type="text"
                      value={editForm.brand}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, brand: e.target.value }))}
                      placeholder="e.g. Sony, Apple, Samsung"
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-[var(--foreground)] block mb-1">Description</label>
                  <TextArea
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief overview of features and capabilities..."
                    rows={3}
                    className="w-full rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                  />
                </div>
              </div>

              {/* 2. Pricing & Inventory */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Pricing &amp; Inventory</h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                      Price ({currencySymbol}) *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.price}
                      onChange={(e) => handleEditPriceChange(e.target.value, editForm.originalPrice)}
                      required
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                      Original Price ({currencySymbol})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editForm.originalPrice}
                      onChange={(e) => handleEditPriceChange(editForm.price, e.target.value)}
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                      Cost / Invest ({currencySymbol})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="8.99"
                      value={editForm.investPrice}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, investPrice: e.target.value }))}
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">Discount (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={editForm.discountPercentage}
                      onChange={(e) => handleEditDiscountChange(e.target.value)}
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">Stock Quantity</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 32"
                      value={editForm.stockQuantity}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          stockQuantity: e.target.value,
                          inStock: parseInt(e.target.value, 10) > 0 ? true : prev.inStock,
                        }))
                      }
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-bold"
                    />
                  </div>
                </div>

                <p className="flex items-start gap-1.5 text-[10px] text-[var(--foreground-muted)]">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  Leave Stock Quantity blank if this product has no stock count. It then sells without any stock limit.
                </p>

                {/* In Stock is the store's own switch; a seller's stock count drives it. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between gap-3 p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]/60">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[var(--foreground)]">In Stock</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        {isVendor
                          ? "Driven by the stock count above"
                          : !editStockTracked
                            ? "Not tracked — the product is always available"
                            : hasEditPositiveStock
                              ? "Automatically enabled (Stock > 0)"
                              : "Mark if product is ready for purchase"}
                      </p>
                    </div>
                    {!isVendor && editStockTracked && (
                      <Switch
                        isSelected={hasEditPositiveStock ? true : editForm.inStock}
                        isDisabled={hasEditPositiveStock}
                        onChange={(val) => {
                          if (!hasEditPositiveStock) setEditForm((prev) => ({ ...prev, inStock: !!val }));
                        }}
                        className={`shrink-0 ${hasEditPositiveStock ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <Switch.Content className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                          <Switch.Control className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                            <Switch.Thumb className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"} />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    )}
                  </div>

                  {!isVendor && (
                    <div className="flex items-center justify-between gap-3 p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]/60">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Featured placement
                        </p>
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          Granted from the Promotions desk, where every placement has an end date
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Warranty */}
                <div className="pt-2">
                  <label className="text-xs font-bold text-[var(--foreground)] block mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Warranty Period (months)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    placeholder="e.g. 12"
                    disabled={editForm.warrantyType === "none"}
                    value={editForm.warrantyPeriodMonths}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, warrantyPeriodMonths: e.target.value }))
                    }
                    className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                  />
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                    The cover promised on the product page, counted from the delivery date. A period of 0 means
                    <span className="font-semibold"> No Warranty</span>. Editing this only affects future orders.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-bold text-[var(--foreground)] block mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Warranty Type
                  </label>
                  <AppSelect
                    ariaLabel="Warranty type"
                    value={editForm.warrantyType}
                    placeholder="Select warranty type"
                    options={WARRANTY_TYPE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    onChange={(warrantyType) =>
                      setEditForm((prev) => ({
                        ...prev,
                        warrantyType,
                        ...(warrantyType === "none" ? { warrantyPeriodMonths: "" } : {}),
                      }))
                    }
                  />
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                    {WARRANTY_TYPE_OPTIONS.find((o) => o.value === editForm.warrantyType)?.customerAction}
                  </p>
                  {editForm.warrantyType === "manufacturer-warranty" && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Fill in the Brand field or a Brand row in Specifications — the brand carries this warranty.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <label className="text-xs font-bold text-[var(--foreground)] block mb-1 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-primary" /> Warranty Terms
                  </label>
                  <TextArea
                    placeholder="e.g. Covers manufacturing defects for 12 months from delivery date..."
                    value={editForm.warrantyTerms}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, warrantyTerms: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs border border-[var(--border-color)] px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                    Shown to customers on the product page. Required when the type is
                    <span className="font-semibold"> Other warranty</span>.
                  </p>
                </div>

                {/* Offer countdown — only for a real discount */}
                {editBaseline.offerLapsed && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 rounded-xl px-3 py-2">
                    This offer has already ended, so the shop is at the original price. Set a new end date to renew
                    it — saving keeps the current price either way.
                  </p>
                )}

                {hasEditDiscount ? (
                  <HeroUIDateTimePicker
                    label="Special Deal Countdown End Date & Time"
                    value={editForm.offerEndDate}
                    onChange={(isoString) => setEditForm((prev) => ({ ...prev, offerEndDate: isoString }))}
                    helperText="When the countdown timer finishes, the deal price automatically resets to the original price across the store."
                  />
                ) : (
                  <p className="text-[11px] text-[var(--foreground-muted)] bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                    Set an original price higher than the selling price to run a deal countdown. With both prices the
                    same there is no offer to count down.
                  </p>
                )}
              </div>

              {/* 3. Media */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Product Media</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <ImageUploader
                      label="Thumbnail (Primary)"
                      value={editForm.image}
                      onChange={(url) => setEditForm((prev) => ({ ...prev, image: url }))}
                      hint="Recommended: 800 × 800 px (1:1 Square, JPG/PNG/WebP, max 2MB)."
                    />
                  </div>
                  <div>
                    <ImageUploader
                      label="Gallery Image"
                      value={editForm.additionalImages[0] || ""}
                      onChange={(url) =>
                        setEditForm((prev) => ({ ...prev, additionalImages: url ? [url] : [] }))
                      }
                      hint="Recommended: 800 × 800 px (1:1 Square, JPG/PNG/WebP). Clean product preview."
                    />
                  </div>
                </div>
              </div>

              {/* 4. Category */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Category</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">Category</label>
                    <AppSelect
                      ariaLabel="Product category"
                      value={editForm.categoryId}
                      placeholder="Select Category"
                      onChange={(categoryId) =>
                        setEditForm((prev) => ({ ...prev, categoryId, subCategoryIds: new Set<string>() }))
                      }
                      options={categories.map((c) => ({
                        value: (c._id || c.id || c.slug) as string,
                        label: c.name,
                      }))}
                    />
                  </div>

                  {editAvailableSubCategories.length > 0 && (
                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">Subcategory</label>
                      <div className="flex flex-wrap gap-2 p-2 bg-[var(--surface-alt)] dark:bg-[var(--surface)] rounded-xl border border-[var(--border-color)]">
                        {editAvailableSubCategories.map((sub) => {
                          const subId = (sub._id || sub.id || sub.slug) as string;
                          const isSelected = editForm.subCategoryIds.has(subId);
                          return (
                            <button
                              type="button"
                              key={subId}
                              onClick={() => {
                                const next = new Set(editForm.subCategoryIds);
                                if (isSelected) next.delete(subId);
                                else next.add(subId);
                                setEditForm((prev) => ({ ...prev, subCategoryIds: next }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-2xs"
                                  : "bg-[var(--surface-elevated)] dark:bg-[var(--foreground-muted)] text-[var(--foreground)] hover:bg-[var(--surface-alt)]"
                              }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. Specifications */}
              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Technical Specs</h3>
                  <Button
                    size="sm"
                    type="button"
                    onPress={() => setEditSpecs((prev) => [...prev, { key: "", value: "" }])}
                    className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Row
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {editSpecs.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={row.key}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditSpecs((prev) => prev.map((r, i) => (i === idx ? { ...r, key: val } : r)));
                        }}
                        placeholder="Key (e.g. RAM, Storage, Color)"
                        className="flex-1 h-9 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                      />
                      <Input
                        type="text"
                        value={row.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditSpecs((prev) => prev.map((r, i) => (i === idx ? { ...r, value: val } : r)));
                        }}
                        placeholder="Value (e.g. 16GB DDR5)"
                        className="flex-1 h-9 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                      />
                      {editSpecs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setEditSpecs((prev) => prev.filter((_, i) => i !== idx))}
                          className="p-2 text-[var(--foreground-muted)] hover:text-rose-500 rounded-lg cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
              <Button
                type="button"
                onPress={() => onOpenChange(false)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] font-bold text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                isDisabled={isUpdating}
                onPress={handleSave}
                className="px-6 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] font-bold text-xs shadow-xs cursor-pointer hover:opacity-95 transition-all"
              >
                {isUpdating ? "Saving..." : "Save Product"}
              </Button>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}