"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Package,
  Pencil,
  Plus,
  TriangleAlert,
  Clock,
  Sparkles,
  Tag,
  Check,
  X,
  Shield,
  FileText,
  DollarSign,
  Layers,
  Sparkle,
  Send,
  Trash2,
} from "lucide-react";
import {
  Modal,
  Input,
  Button,
  Select,
  ListBox,
} from "@heroui/react";
import { toast } from "react-toastify";
import CatalogFiltersBar from "@/components/dashboard/CatalogFiltersBar";
import type { VendorPagination, VendorProduct, VendorProductPlan } from "@/types/vendor";
import type { Category, SubCategory } from "@/types";
import { getVendorProductStatusStyle } from "@/lib/vendorProductStatus";
import {
  archiveVendorProduct,
  deleteVendorProduct,
  submitVendorProduct,
  unarchiveVendorProduct,
  updateVendorProduct,
} from "@/lib/action/vendor";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { recalcPricing } from "@/lib/pricing";
import { WARRANTY_TYPE_OPTIONS } from "@/lib/warranty";
import ImageUploader from "@/components/shared/ImageUploader";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";

/**
 * The vendor's catalogue.
 *
 * The plan usage sits above the table because it is the one number that
 * explains why "Add product" may refuse to publish: the limit is counted from
 * live rows, not from rows in the table.
 */

interface VendorProductsClientProps {
  products: VendorProduct[];
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
  plan: VendorProductPlan;
  filters: {
    status: string;
    search: string;
    stock: string;
    sort: string;
    category: string;
    subCategory: string;
  };
  categories?: Category[];
  subcategories?: SubCategory[];
  initialEditId?: string;
}

/**
 * The strip's tabs. There is no drafts tab: a saved listing is a submission,
 * and "Published" is the live shelf, sold-out rows included — the stock chips
 * below ask that question on their own.
 */
const TABS = [
  { key: "all", label: "All" },
  { key: "pending_review", label: "In review" },
  { key: "published", label: "Published" },
  { key: "rejected", label: "Rejected" },
  { key: "archived", label: "Archived" },
];

/** The same order the admin desk offers, read against the seller's own rows. */
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
];

export default function VendorProductsClient({
  products,
  typeCounts,
  pagination,
  plan,
  filters,
  categories = [],
  subcategories = [],
  initialEditId,
}: VendorProductsClientProps) {
  const router = useRouter();
  const { formatPrice, currencySymbol } = useSiteSettings();
  const [archiving, setArchiving] = useState<string | null>(null);
  // A review move (submit or withdraw) is its own busy flag, so the archive
  // buttons stay usable while a submission is in flight.
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VendorProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await deleteVendorProduct(deleteTarget._id);
      if (res?.success === false) {
        toast.error(res.message || "Could not delete product");
        return;
      }
      toast.success("Product deleted");
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting product");
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Edit Modal State ──
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
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
    offerEndDate: null as string | null,
    warrantyType: "none",
    warrantyPeriodMonths: 0,
    warrantyTerms: "",
  });

  const editAvailableSubCategories = useMemo(() => {
    if (!editForm.categoryId) return [];
    return subcategories.filter(
      (sub) =>
        sub.categoryId === editForm.categoryId ||
        String(sub.categoryId) === String(editForm.categoryId)
    );
  }, [editForm.categoryId, subcategories]);

  const handleOpenEdit = (p: VendorProduct) => {
    const id = p._id || p.id || "";
    setEditingProductId(id);

    let catId = "";
    if (p.categoryId) {
      if (typeof p.categoryId === "object" && (p.categoryId as any)._id) {
        catId = (p.categoryId as any)._id;
      } else if (typeof p.categoryId === "string") {
        catId = p.categoryId;
      }
    }

    const subIds = new Set<string>();
    if (Array.isArray(p.subCategoryIds)) {
      p.subCategoryIds.forEach((s) => {
        const sid = typeof s === "object" ? s._id || s.id : s;
        if (sid) subIds.add(String(sid));
      });
    }

    const calc = recalcPricing(
      {
        price: p.price != null ? String(p.price) : "",
        originalPrice: p.originalPrice != null ? String(p.originalPrice) : "",
        discountPercentage: "",
      },
      "price"
    );

    setEditForm({
      title: p.title || "",
      slug: p.slug || "",
      price: p.price != null ? String(p.price) : "",
      originalPrice: p.originalPrice != null ? String(p.originalPrice) : "",
      investPrice: p.investPrice != null ? String(p.investPrice) : "",
      discountPercentage: calc.discountPercentage != null ? String(calc.discountPercentage) : "",
      stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : "",
      sku: p.sku || "",
      brand: p.brand || "",
      description: p.description || "",
      image: p.image || "",
      additionalImages: Array.isArray(p.additionalImages) ? [...p.additionalImages] : [],
      categoryId: catId,
      subCategoryIds: subIds,
      offerEndDate: (p as any).offerEndDate ? new Date((p as any).offerEndDate).toISOString() : null,
      warrantyType: (p as any).warrantyType || "none",
      warrantyPeriodMonths: (p as any).warrantyPeriodMonths || 0,
      warrantyTerms: (p as any).warrantyTerms || "",
    });

    setIsEditOpen(true);
  };

  useEffect(() => {
    if (initialEditId) {
      const match = products.find((p) => p._id === initialEditId || p.id === initialEditId);
      if (match) {
        handleOpenEdit(match);
      }
    }
  }, [initialEditId, products]);

  const handlePriceChange = (val: string) => {
    const calc = recalcPricing(
      { price: val, originalPrice: editForm.originalPrice, discountPercentage: "" },
      "price"
    );
    setEditForm((prev) => ({
      ...prev,
      price: val,
      discountPercentage: calc.discountPercentage != null ? String(calc.discountPercentage) : "",
    }));
  };

  const handleOriginalPriceChange = (val: string) => {
    const calc = recalcPricing(
      { price: editForm.price, originalPrice: val, discountPercentage: "" },
      "originalPrice"
    );
    setEditForm((prev) => ({
      ...prev,
      originalPrice: val,
      discountPercentage: calc.discountPercentage != null ? String(calc.discountPercentage) : "",
    }));
  };

  const handleSaveEdit = async () => {
    if (!editingProductId) return;
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

    setIsUpdating(true);
    try {
      const payload: any = {
        title: editForm.title.trim(),
        slug: editForm.slug.trim() || undefined,
        price: Number(editForm.price),
        originalPrice: editForm.originalPrice ? Number(editForm.originalPrice) : null,
        investPrice: editForm.investPrice ? Number(editForm.investPrice) : null,
        stockQuantity: editForm.stockQuantity !== "" ? Number(editForm.stockQuantity) : null,
        sku: editForm.sku.trim() || undefined,
        brand: editForm.brand.trim() || undefined,
        description: editForm.description.trim() || undefined,
        image: editForm.image,
        additionalImages: editForm.additionalImages,
        categoryId: editForm.categoryId || undefined,
        subCategoryIds: Array.from(editForm.subCategoryIds),
        offerEndDate: editForm.offerEndDate,
        warrantyType: editForm.warrantyType,
        warrantyPeriodMonths: Number(editForm.warrantyPeriodMonths) || 0,
        warrantyTerms: editForm.warrantyTerms.trim() || undefined,
      };

      const res = await updateVendorProduct(editingProductId, payload);
      if (res?.success === false) {
        toast.error(res.message || "Failed to update product");
        return;
      }

      toast.success("Product updated successfully!");
      setIsEditOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating product");
    } finally {
      setIsUpdating(false);
    }
  };

  const atLimit = plan.used >= plan.maxProducts;

  /**
   * A subcategory only makes sense inside the category that offered it, so the
   * picker lists the children of the chosen category and nothing else — the
   * same pair the admin desk builds.
   */
  const filterableSubCategories = useMemo(() => {
    const active = categories.find((c) => (c.slug || c.name) === filters.category);
    const catId = active?._id || active?.id;
    if (!catId) return [];
    return subcategories.filter((sub) => {
      const parent = sub.categoryId as unknown;
      const parentId =
        typeof parent === "object" && parent !== null
          ? (parent as { _id?: string; id?: string })._id ||
            (parent as { _id?: string; id?: string }).id
          : parent;
      return Boolean(parentId && String(parentId) === String(catId));
    });
  }, [categories, filters.category, subcategories]);

  // A list read that predates the "all" bucket still shows the right total.
  const tabCounts =
    typeCounts.all === undefined ? { ...typeCounts, all: pagination.total } : typeCounts;

  /**
   * Rebuilds the list URL from the settled set of filters. Every control hands
   * over only what it changed; the rest is read back from the current filters,
   * so a sort never quietly drops a search the seller typed.
   */
  const go = (next: {
    page?: number;
    search?: string;
    status?: string;
    stock?: string;
    sort?: string;
    category?: string;
    subCategory?: string;
  }) => {
    const settled = {
      search: (next.search ?? filters.search).trim(),
      status: next.status ?? filters.status,
      stock: next.stock ?? filters.stock,
      sort: next.sort ?? filters.sort,
      category: next.category ?? filters.category,
      subCategory: next.subCategory ?? filters.subCategory,
    };
    const page = next.page ?? 1;

    const params = new URLSearchParams();
    if (settled.search) params.set("search", settled.search);
    if (settled.status && settled.status !== "all") params.set("status", settled.status);
    if (settled.stock && settled.stock !== "all") params.set("stock", settled.stock);
    if (settled.sort && settled.sort !== "newest") params.set("sort", settled.sort);
    if (settled.category && settled.category !== "all") params.set("category", settled.category);
    if (settled.subCategory && settled.subCategory !== "all") {
      params.set("subCategory", settled.subCategory);
    }
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/vendor/products?${query}` : "/dashboard/vendor/products");
  };

  const archive = async (product: VendorProduct) => {
    if (archiving) return;

    setArchiving(product._id);
    try {
      const res = await archiveVendorProduct(product._id);
      if (res?.success === false) {
        toast.error(res.message || "The product could not be archived");
        return;
      }
      toast.success("Product archived");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setArchiving(null);
    }
  };

  const unarchive = async (product: VendorProduct) => {
    if (archiving) return;

    setArchiving(product._id);
    try {
      const res = await unarchiveVendorProduct(product._id);
      if (res?.success === false) {
        toast.error(res.message || "The product could not be unarchived");
        return;
      }
      toast.success("Product filed for review again");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setArchiving(null);
    }
  };

  /**
   * Files a listing for review. The admin desk is the only place that can
   * publish it, so the seller's job ends here with a submission.
   */
  const submitForReview = async (product: VendorProduct) => {
    if (reviewing) return;

    setReviewing(product._id);
    try {
      const res = await submitVendorProduct(product._id);
      if (res?.success === false) {
        toast.error(res.message || "The product could not be submitted");
        return;
      }
      toast.success("Submitted for review — the store team will take a look.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setReviewing(null);
    }
  };

  const usagePercent = plan.maxProducts > 0 ? Math.min(100, Math.round((plan.used / plan.maxProducts) * 100)) : 100;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Products</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Every listing waits for the store team's review, and only approved products count
            against your plan.
          </p>
        </div>

        <Link
          href="/dashboard/vendor/products/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Add product
        </Link>
      </header>

      {/* Plan usage */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground)]">
            {plan.used} / {plan.maxProducts} Products Used
            <span className="ml-1.5 rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {plan.name}
            </span>
          </p>

          {atLimit ? (
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--brand-flat)] hover:underline"
            >
              <TriangleAlert className="h-3 w-3" />
              Limit reached — free a slot or upgrade before your next listing is approved
            </Link>
          ) : (
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--brand-flat)]"
            >
              Manage plan
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
          <div
            className={`h-full rounded-full ${atLimit ? "bg-rose-500" : "bg-brand-gradient"}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </section>

      {/* Filters — the same browsing bar as the admin desk, read against the
          seller's own rows */}
      <CatalogFiltersBar
        statusOptions={TABS.map((tab) => ({ id: tab.key, label: tab.label }))}
        statusCounts={tabCounts}
        status={filters.status}
        onStatusChange={(id) => go({ status: id, page: 1 })}
        total={pagination.total}
        stock={{
          value: filters.stock,
          onChange: (value) => go({ stock: value, page: 1 }),
        }}
        search={{
          value: filters.search,
          onSubmit: (value) => go({ search: value, page: 1 }),
          placeholder: "Title, SKU or brand",
        }}
        category={
          categories.length > 0
            ? {
                value: filters.category,
                // A subcategory from the old category would narrow the new one
                // to nothing, so switching starts the pair over.
                onChange: (value) =>
                  go({ category: value, subCategory: "all", page: 1 }),
                options: [
                  { value: "all", label: "All categories" },
                  ...categories.map((c) => ({ value: c.slug || c.name, label: c.name })),
                ],
              }
            : undefined
        }
        subCategory={
          filterableSubCategories.length > 0
            ? {
                value: filters.subCategory,
                onChange: (value) => go({ subCategory: value, page: 1 }),
                options: [
                  { value: "all", label: "All subcategories" },
                  ...filterableSubCategories.map((sub) => ({
                    value: sub.slug || sub.name,
                    label: sub.name,
                  })),
                ],
              }
            : undefined
        }
        sort={{
          value: filters.sort,
          onChange: (value) => go({ sort: value || "newest", page: 1 }),
          options: SORT_OPTIONS,
        }}
        onReset={() =>
          go({
            status: "all",
            stock: "all",
            search: "",
            sort: "newest",
            category: "all",
            subCategory: "all",
            page: 1,
          })
        }
        canReset={Boolean(
          filters.search ||
            filters.status !== "all" ||
            filters.stock !== "all" ||
            filters.sort !== "newest" ||
            filters.category !== "all" ||
            filters.subCategory !== "all"
        )}
      />

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {products.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Package className="h-6 w-6 text-[var(--foreground-muted)]" />
            <p className="text-xs font-semibold text-[var(--foreground)]">No products here</p>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              {filters.search ||
              filters.status !== "all" ||
              filters.stock !== "all" ||
              filters.category !== "all" ||
              filters.subCategory !== "all"
                ? "Nothing matches this view."
                : "Add your first product to get started."}
            </p>
            <Link
              href="/dashboard/vendor/products/new"
              className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
            >
              <Plus className="h-3 w-3" />
              Add product
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {products.map((product) => {
              const style = getVendorProductStatusStyle(product.vendorProductStatus);
              const StatusIcon = style.icon;
              const category =
                typeof product.categoryId === "object" && product.categoryId
                  ? product.categoryId.name
                  : "—";
              const stock =
                product.stockQuantity === null || product.stockQuantity === undefined
                  ? "Not tracked"
                  : `${product.stockQuantity} in stock`;

              return (
                <li key={product._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-[var(--foreground-muted)]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[var(--foreground)]">{product.title}</p>
                    <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                      {category}
                      {product.sku ? ` · ${product.sku}` : ""} · {stock}
                    </p>
                    {product.vendorProductStatus === "rejected" && product.vendorRejectionReason ? (
                      <p className="mt-0.5 flex items-start gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                        <TriangleAlert className="mt-px h-3 w-3 shrink-0" />
                        <span className="line-clamp-2">{product.vendorRejectionReason}</span>
                      </p>
                    ) : null}
                  </div>

                  <p className="text-xs font-bold text-[var(--foreground)]">{formatPrice(product.price)}</p>

                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                  >
                    <StatusIcon className="h-2.5 w-2.5" />
                    {style.label}
                  </span>

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/dashboard/vendor/products/${product._id}/view`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(product)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>

                    {(product.vendorProductStatus === "draft" ||
                      product.vendorProductStatus === "rejected") && (
                      <button
                        type="button"
                        onClick={() => submitForReview(product)}
                        disabled={reviewing === product._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-50/50 dark:bg-sky-950/30 px-2 py-1.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400 transition-colors hover:bg-sky-100 dark:hover:bg-sky-900/40 disabled:opacity-50 cursor-pointer"
                        title="Send this listing to the store team for approval"
                      >
                        {reviewing === product._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Submit
                      </button>
                    )}

                    {product.vendorProductStatus === "archived" ? (
                      product.archivedBy === "admin" ? (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 px-2 py-1.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400 opacity-75 cursor-not-allowed"
                          title="Archived by an administrator — only an admin can unarchive this product"
                        >
                          <Archive className="h-3 w-3" />
                          Archived by Admin
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => unarchive(product)}
                          disabled={archiving === product._id}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/30 px-2 py-1.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50 cursor-pointer"
                          title="File it for review again"
                        >
                          {archiving === product._id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ArchiveRestore className="h-3 w-3" />
                          )}
                          Unarchive
                        </button>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => archive(product)}
                        disabled={archiving === product._id}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
                      >
                        {archiving === product._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Archive className="h-3 w-3" />
                        )}
                        Archive
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(product)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                      title="Delete product"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2.5 shadow-2xs">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} products
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

      {/* ════════════════════════════════════════════════════════
          VENDOR EDIT PRODUCT MODAL (Matching Admin Modal)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isEditOpen} onOpenChange={setIsEditOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-[var(--foreground)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-[var(--foreground)]">
                    Edit Product
                  </h2>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Update listing information, pricing, media and warranty.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="p-1 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-6">
                {/* 1. Core Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Basic Information
                  </h3>
                  <div>
                    <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                      Product Title <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Wireless Noise Cancelling Headphones"
                      className="w-full bg-[var(--surface-alt)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        URL Slug
                      </label>
                      <Input
                        type="text"
                        value={editForm.slug}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                        placeholder="auto-generated-from-title"
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        SKU
                      </label>
                      <Input
                        type="text"
                        value={editForm.sku}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, sku: e.target.value }))}
                        placeholder="e.g. WH-1000XM4"
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Taxonomy */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Category & Subcategories
                  </h3>
                  <div>
                    <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                      Category
                    </label>
                    <Select
                      selectedKey={editForm.categoryId || null}
                      onSelectionChange={(key) => {
                        const sel = key ? String(key) : "";
                        setEditForm((prev) => ({
                          ...prev,
                          categoryId: sel,
                          subCategoryIds: new Set<string>(),
                        }));
                      }}
                      placeholder="Select Category"
                      className="w-full"
                    >
                      <Select.Trigger className="w-full bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs flex justify-between items-center text-[var(--foreground)]">
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Popover className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 p-1">
                        <ListBox className="max-h-60 overflow-y-auto">
                          {categories.map((c) => {
                            const cId = c.id || (c as any)._id;
                            return (
                              <ListBox.Item
                                key={cId}
                                id={cId}
                                textValue={c.name}
                                className="px-3 py-2 text-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-[var(--foreground)]"
                              >
                                {c.name}
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {editAvailableSubCategories.length > 0 && (
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1.5">
                        Subcategories
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {editAvailableSubCategories.map((sub) => {
                          const subId = sub.id || (sub as any)._id;
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
                                  : "bg-[var(--surface-alt)] text-[var(--foreground)] hover:bg-[var(--surface-elevated)] border border-[var(--border-color)]"
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

                {/* 3. Pricing & Inventory */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Pricing & Inventory ({currencySymbol})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        Selling Price ({currencySymbol}) <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.price}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        Original / MSRP ({currencySymbol})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.originalPrice}
                        onChange={(e) => handleOriginalPriceChange(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        Cost / Invest Price ({currencySymbol})
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editForm.investPrice}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, investPrice: e.target.value }))}
                        placeholder="0.00"
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        Stock Quantity
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={editForm.stockQuantity}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                        placeholder="Leave blank for untracked"
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        Brand
                      </label>
                      <Input
                        type="text"
                        value={editForm.brand}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, brand: e.target.value }))}
                        placeholder="e.g. Sony, Apple, Samsung"
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Product Media */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Product Media
                  </h3>
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
                          setEditForm((prev) => ({
                            ...prev,
                            additionalImages: url ? [url] : [],
                          }))
                        }
                        hint="Recommended: 800 × 800 px (1:1 Square, JPG/PNG/WebP). Clean product preview."
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Limited-Time Offer */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Limited-Time Offer
                  </h3>

                  <div>
                    <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                      Offer Countdown Timer
                    </label>
                    <HeroUIDateTimePicker
                      value={editForm.offerEndDate}
                      onChange={(iso) => setEditForm((prev) => ({ ...prev, offerEndDate: iso }))}
                    />
                  </div>
                </div>

                {/* 6. Warranty */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Warranty
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        Warranty Type
                      </label>
                      <Select
                        selectedKey={editForm.warrantyType || "none"}
                        onSelectionChange={(key) => {
                          const sel = key ? String(key) : "none";
                          setEditForm((prev) => ({ ...prev, warrantyType: sel }));
                        }}
                        className="w-full"
                      >
                        <Select.Trigger className="w-full bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs flex justify-between items-center text-[var(--foreground)]">
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Popover className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 p-1">
                          <ListBox className="max-h-60 overflow-y-auto">
                            {WARRANTY_TYPE_OPTIONS.map((opt) => (
                              <ListBox.Item
                                key={opt.value}
                                id={opt.value}
                                textValue={opt.label}
                                className="px-3 py-2 text-xs rounded-lg hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer text-[var(--foreground)]"
                              >
                                {opt.label}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[var(--foreground)] block mb-1">
                        Period (Months)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={String(editForm.warrantyPeriodMonths)}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            warrantyPeriodMonths: Number(e.target.value) || 0,
                          }))
                        }
                        className="w-full bg-[var(--surface-alt)]"
                      />
                    </div>
                  </div>
                </div>

                {/* 7. Description */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Description
                  </h3>
                  <textarea
                    rows={4}
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter detailed product description..."
                    className="w-full rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3 text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] outline-none focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button
                  type="button"
                  onPress={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-elevated)] transition cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onPress={handleSaveEdit}
                  isDisabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-90 transition cursor-pointer"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-[var(--foreground)]">Delete Product?</h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    &ldquo;{deleteTarget?.title}&rdquo;
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  type="button"
                  onPress={() => setDeleteTarget(null)}
                  isDisabled={isDeleting}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-bold text-[var(--foreground)] cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onPress={handleConfirmDelete}
                  isDisabled={isDeleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
