"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  TextArea,
  Button,
  Modal,
  Pagination,
} from "@heroui/react";
import {
  Package,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Sparkles,
  DollarSign,
  Layers,
  Check,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  Shield,
  Info,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import CatalogFiltersBar from "@/components/dashboard/CatalogFiltersBar";
import { Product, Category, SubCategory } from "@/types";
import ProductEditModal from "@/components/dashboard/ProductEditModal";
import { updateProduct, deleteProduct, archiveProduct, unarchiveProduct, reviewVendorProduct } from "@/lib/action/products";
import { getVendorProductStatusStyle } from "@/lib/vendorProductStatus";
import { isStockTracked } from "@/lib/stock";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "price_asc", label: "Price: Low to High" },
];

/**
 * The desk's listing-status filter.
 *
 * Platform stock carries no vendor status and is always live, so it only shows
 * under "All". "Live" answers for the sold-out rows too — an approved listing
 * is live whether or not it has units, and the Stock column is where the desk
 * reads which ones are empty — so there is no separate sold-out tab. There is
 * no drafts tab either: a saved listing enters the review queue directly.
 */
const LISTING_STATUS_OPTIONS = [
  { id: "all", label: "All listings" },
  { id: "pending_review", label: "Review" },
  { id: "published", label: "Live" },
  { id: "rejected", label: "Rejected" },
  { id: "archived", label: "Archived" },
];

/** The statuses worth a pill in the row: live rows already say so in Stock. */
const REVIEW_STATUSES = ["draft", "pending_review", "rejected", "archived"];

/**
 * Whether a row is a seller's stock rather than the store's own.
 *
 * Archiving is the owner's shelf move. The store's desk keeps what the store
 * itself sells, and a seller's row leaves the shop through the review decision
 * that owns it, so the archive control is not offered here.
 */
function isSellerListing(product: Product) {
  const owner = product as Product & { vendorId?: string | null };
  return Boolean(product.seller || owner.vendorId);
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductsClientProps {
  initialProducts: Product[];
  pagination: PaginationMeta;
  /** Rows per listing-status tab, counted with the other filters applied. */
  statusCounts?: Record<string, number>;
  categories?: Category[];
  subcategories?: SubCategory[];
}

export default function ProductsClient({
  initialProducts = [],
  pagination,
  statusCounts = {},
  categories = [],
  subcategories = [],
}: ProductsClientProps) {
  const { formatPrice } = useSiteSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    setProducts(Array.isArray(initialProducts) ? initialProducts : []);
  }, [initialProducts]);

  const currentCategory = searchParams.get("category") || "all";
  const currentSubCategory = searchParams.get("subCategory") || "all";
  const currentStock = searchParams.get("inStock") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentListing = searchParams.get("vendorStatus") || "all";

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (
          val === undefined ||
          val === "" ||
          (key === "category" && val.toLowerCase() === "all") ||
          (key === "subCategory" && val.toLowerCase() === "all") ||
          (key === "inStock" && val.toLowerCase() === "all") ||
          (key === "vendorStatus" && val.toLowerCase() === "all")
        ) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      const qs = params.toString();
      startTransition(() => {
        router.push(`/dashboard/admin/products${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleResetFilters = () => {
    startTransition(() => {
      router.push("/dashboard/admin/products", { scroll: false });
    });
  };

  // The subcategories that belong to the chosen category. The second picker
  // only exists once the category actually has something under it, and the
  // toolbar's layout follows the same question.
  const filterableSubCategories = useMemo(() => {
    const active = categories.find((c) => (c.slug || c.name) === currentCategory);
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
  }, [categories, currentCategory, subcategories]);

  // Edit Modal State — the form itself lives in the shared ProductEditModal.
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setIsEditOpen(true);
  };

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Open Delete Modal
  const handleOpenDelete = (p: Product) => {
    setDeletingProduct(p);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    const id = deletingProduct.id || (deletingProduct as any)._id;
    setIsDeleting(true);

    try {
      const res = await deleteProduct(id);
      if (res?.success !== false) {
        toast.success("Product deleted successfully!");
        setProducts((prev) => prev.filter((p) => (p.id || (p as any)._id) !== id));
        setIsDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to delete product");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting product");
    } finally {
      setIsDeleting(false);
    }
  };

  const [archivingId, setArchivingId] = useState<string | null>(null);

  const handleToggleArchive = async (p: Product) => {
    const id = p.id || (p as any)._id;
    if (!id || archivingId) return;

    const isArchived = (p as any).vendorProductStatus === "archived";
    const archivedBy = (p as any).archivedBy as "admin" | "vendor" | null | undefined;
    if (isArchived && archivedBy === "vendor") {
      toast.error("This product was archived by its vendor. Only the vendor can unarchive it.");
      return;
    }

    setArchivingId(id);

    try {
      const res = isArchived ? await unarchiveProduct(id) : await archiveProduct(id);
      if (res?.success !== false) {
        toast.success(isArchived ? "Product unarchived and active!" : "Product archived!");
        setProducts((prev) =>
          prev.map((prod) => {
            const prodId = prod.id || (prod as any)._id;
            if (prodId === id) {
              return {
                ...prod,
                vendorProductStatus: isArchived ? "published" : "archived",
                isVisible: isArchived,
                archivedBy: isArchived ? null : "admin",
              };
            }
            return prod;
          })
        );
        router.refresh();
      } else {
        toast.error(res?.message || (isArchived ? "Failed to unarchive product" : "Failed to archive product"));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating archive status");
    } finally {
      setArchivingId(null);
    }
  };

  // ── Review desk ────────────────────────────────────────────────────────────
  // A listing only reaches the shop through this decision, so both answers are
  // recorded: an approval puts the row live, a rejection stores the reason the
  // seller must fix before resubmitting.
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingProduct, setRejectingProduct] = useState<Product | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async (p: Product) => {
    const id = p.id || (p as any)._id;
    if (!id || reviewingId) return;

    setReviewingId(id);
    try {
      const res = await reviewVendorProduct(id, "approve");
      if (res?.success === false) {
        toast.error(res.message || "The listing could not be approved");
        return;
      }
      toast.success("Listing approved and live in the shop");
      setProducts((prev) =>
        prev.map((prod) =>
          (prod.id || (prod as any)._id) === id
            ? { ...prod, vendorProductStatus: "published", vendorRejectionReason: "", isVisible: true }
            : prod
        )
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error approving listing");
    } finally {
      setReviewingId(null);
    }
  };

  const handleOpenReject = (p: Product) => {
    setRejectingProduct(p);
    setRejectReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingProduct) return;
    const reason = rejectReason.trim();
    if (reason.length < 5) {
      toast.error("Tell the seller what to change (at least 5 characters)");
      return;
    }

    const id = rejectingProduct.id || (rejectingProduct as any)._id;
    setIsRejecting(true);
    try {
      const res = await reviewVendorProduct(id, "reject", reason);
      if (res?.success === false) {
        toast.error(res.message || "The listing could not be sent back");
        return;
      }
      toast.success("Listing sent back to the seller");
      setProducts((prev) =>
        prev.map((prod) =>
          (prod.id || (prod as any)._id) === id
            ? { ...prod, vendorProductStatus: "rejected", vendorRejectionReason: reason, isVisible: false }
            : prod
        )
      );
      setRejectingProduct(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error rejecting listing");
    } finally {
      setIsRejecting(false);
    }
  };

  const { page, limit, total, totalPages } = pagination || {
    page: 1,
    limit: 10,
    total: products.length,
    totalPages: 1,
  };
  // A page can outlive the rows it counted: the summary then has to stay inside
  // the real range instead of printing "41–12 of 12".
  const startItem = total > 0 ? Math.min((page - 1) * limit + 1, total) : 0;
  const endItem = total > 0 ? Math.min(page * limit, total) : 0;

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Products</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Product{" "}
            <span className="text-primary">
              Catalog
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Manage inventory, view detailed specifications, update pricing and edit items.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/dashboard/admin/products/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* ── Status Tabs, Search & Filters ── */}
      <CatalogFiltersBar
        statusOptions={LISTING_STATUS_OPTIONS}
        statusCounts={statusCounts}
        status={currentListing}
        onStatusChange={(id) => updateParams({ vendorStatus: id === "all" ? undefined : id })}
        total={total}
        stock={{
          // The URL keeps the public "inStock" token; the bar speaks in/out.
          value: currentStock === "true" ? "in" : currentStock === "false" ? "out" : "all",
          onChange: (value) =>
            updateParams({
              inStock: value === "all" ? undefined : value === "in" ? "true" : "false",
            }),
        }}
        search={{
          value: currentSearch,
          onSubmit: (value) => updateParams({ search: value }),
          placeholder: "Search by title, SKU, or category...",
        }}
        category={
          categories.length > 0
            ? {
                value: currentCategory,
                // A subcategory only means something inside the category that
                // offered it, so switching categories starts the pair over.
                onChange: (value) =>
                  updateParams({
                    category: value === "all" ? undefined : value,
                    subCategory: undefined,
                  }),
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
                value: currentSubCategory,
                onChange: (value) =>
                  updateParams({ subCategory: value === "all" ? undefined : value }),
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
          value: currentSort,
          onChange: (value) => updateParams({ sort: value || "newest" }),
          options: SORT_OPTIONS.map((opt) => ({ value: opt.key, label: opt.label })),
        }}
        onReset={handleResetFilters}
        canReset={Boolean(
          currentSearch ||
            currentCategory !== "all" ||
            currentSubCategory !== "all" ||
            currentStock !== "all" ||
            currentSort !== "newest" ||
            currentListing !== "all"
        )}
      />


      {/* ── Products Table ── */}
      {isPending ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading products...</p>
        </Card>
      ) : products.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              No products found
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {currentSearch
                ? "No products matched your search keyword or filters."
                : "Your store does not have any products yet."}
            </p>
          </div>
          <Link
            href="/dashboard/admin/products/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Product</span>
          </Link>
        </Card>
      ) : (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/80 dark:bg-[var(--surface-alt)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4 text-center">Sold</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {products.map((product) => {
                  const id = product.id || (product as any)._id;
                  const catName =
                    product.categoryId?.name ||
                    (product.categories && product.categories[0]) ||
                    "Uncategorized";
                  // Only a seller's row that is waiting, hidden or sent back
                  // gets a pill here; a live row already reads as live in Stock.
                  const listingStatus = (product as any).vendorProductStatus as string | undefined;
                  const listingStyle =
                    listingStatus && REVIEW_STATUSES.includes(listingStatus)
                      ? getVendorProductStatusStyle(listingStatus)
                      : null;
                  const ListingIcon = listingStyle?.icon;

                  return (
                    <tr
                      key={id}
                      className="hover:bg-[var(--surface-alt)]/70 dark:hover:bg-[var(--surface)]/30 transition-colors group"
                    >
                      {/* Product Media & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-5 h-5 text-[var(--foreground-muted)]" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/dashboard/admin/products/${product.slug}`}
                              className="font-bold text-[var(--foreground)] text-xs sm:text-sm hover:text-primary dark:hover:text-primary transition-colors line-clamp-1"
                            >
                              {product.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              {product.sku && (
                                <span className="font-mono text-[10px] text-[var(--foreground-muted)] uppercase">
                                  SKU: {product.sku}
                                </span>
                              )}
                              {product.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                  <Sparkles className="w-2.5 h-2.5" /> Featured
                                </span>
                              )}
                              {listingStyle && ListingIcon && (
                                <span
                                  className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${listingStyle.badge}`}
                                  title={
                                    listingStatus === "rejected" && product.vendorRejectionReason
                                      ? `Sent back: ${product.vendorRejectionReason}`
                                      : listingStyle.description
                                  }
                                >
                                  <ListingIcon className="w-2.5 h-2.5" />
                                  {listingStyle.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-alt)] text-[var(--foreground)] text-xs font-semibold">
                          <Layers className="w-3 h-3 text-primary" />
                          {catName}
                        </span>
                      </td>

                      {/* Price & Profit */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--foreground)] text-sm">
                            {formatPrice(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-[11px] text-[var(--foreground-muted)] line-through">
                              {formatPrice(product.originalPrice)}
                            </span>
                          )}
                          {product.investPrice != null ? (() => {
                            // One unit at cost is break-even: no sign, no green, no
                            // red — the row should not claim a profit that is zero.
                            const margin = product.price - product.investPrice;
                            const tone =
                              margin > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : margin < 0
                                  ? "text-rose-500"
                                  : "text-[var(--foreground-muted)]";
                            const sign = margin > 0 ? "+" : margin < 0 ? "-" : "";
                            return (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span
                                  className={`text-[10px] font-bold ${tone}`}
                                  title={`Cost: ${formatPrice(product.investPrice)} | P/L: ${sign}${formatPrice(Math.abs(margin))}`}
                                >
                                  {sign}{formatPrice(Math.abs(margin))} P/L
                                </span>
                                {product.profitMargin != null && (
                                  <span className="text-[9px] text-[var(--foreground-muted)] font-medium">
                                    ({product.profitMargin}%)
                                  </span>
                                )}
                              </div>
                            );
                          })() : null}
                        </div>
                      </td>

                      {/* Units Sold */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[var(--foreground)]">
                          {product.sellCount ?? 0}
                        </span>
                        <span className="block text-[10px] text-[var(--foreground-muted)] font-medium">sold</span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isStockTracked(product.stockQuantity) ? (
                          <>
                            <span
                              className={`font-mono text-xs font-bold ${
                                (product.stockQuantity ?? 0) > 10
                                  ? "text-[var(--foreground)]"
                                  : (product.stockQuantity ?? 0) > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-500"
                              }`}
                            >
                              {product.stockQuantity}
                            </span>
                            <span className="block text-[10px] text-[var(--foreground-muted)]">units</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-[var(--foreground-muted)]">
                              Not tracked
                            </span>
                            <span className="block text-[10px] text-[var(--foreground-muted)]">always available</span>
                          </>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {!isStockTracked(product.stockQuantity) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--surface-alt)] text-[var(--foreground-muted)] border border-[var(--border-color)]">
                            <Package className="w-3 h-3" />
                            Not Tracked
                          </span>
                        ) : product.inStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
                            <XCircle className="w-3 h-3" />
                            Out of Stock
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/dashboard/admin/products/${product.slug}`}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:text-primary hover:bg-primary/10 transition-colors"
                            title="View Product Page"
                          >
                            <Eye className="w-[18px] h-[18px]" />
                          </Link>
                          {/* Edit and Delete are for the desk's own products only;
                              a seller's listing can be archived or reviewed here, not edited. */}
                          {!isSellerListing(product) && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(product)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer bg-transparent"
                              title="Quick Edit (your own products only)"
                            >
                              <Edit2 className="w-[18px] h-[18px]" />
                            </button>
                          )}
                          {listingStatus === "pending_review" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApprove(product)}
                                disabled={reviewingId === id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer bg-transparent disabled:opacity-50"
                                title="Approve and publish this listing"
                              >
                                {reviewingId === id ? (
                                  <Loader2 className="w-[18px] h-[18px] animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-[18px] h-[18px]" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReject(product)}
                                disabled={reviewingId === id}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer bg-transparent disabled:opacity-50"
                                title="Reject with a reason for the seller"
                              >
                                <XCircle className="w-[18px] h-[18px]" />
                              </button>
                            </>
                          )}
                          {(() => {
                            const isArchived = (product as any).vendorProductStatus === "archived";
                            const archivedByVendor = isArchived && (product as any).archivedBy === "vendor";
                            return (
                              <button
                                type="button"
                                onClick={() => handleToggleArchive(product)}
                                disabled={archivingId === (product.id || (product as any)._id) || archivedByVendor}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors bg-transparent ${
                                  archivedByVendor
                                    ? "text-[var(--foreground-muted)] opacity-40 cursor-not-allowed"
                                    : isArchived
                                      ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 cursor-pointer"
                                      : "text-[var(--foreground-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                                }`}
                                title={
                                  archivedByVendor
                                    ? "Archived by vendor — only the vendor can unarchive"
                                    : isArchived
                                      ? "Unarchive Product"
                                      : "Archive Product"
                                }
                              >
                                {isArchived ? (
                                  <ArchiveRestore className="w-[18px] h-[18px]" />
                                ) : (
                                  <Archive className="w-[18px] h-[18px]" />
                                )}
                              </button>
                            );
                          })()}
                          {!isSellerListing(product) && (
                            <button
                              type="button"
                              onClick={() => handleOpenDelete(product)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer bg-transparent"
                              title="Delete Product"
                            >
                              <Trash2 className="w-[18px] h-[18px]" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40 dark:bg-[var(--surface-elevated)]/40">
              <Pagination className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--foreground-muted)]">
                <Pagination.Summary className="text-xs">
                  Showing <span className="text-[var(--foreground)] font-bold">{startItem}–{endItem}</span> of{" "}
                  <span className="text-primary font-bold">{total}</span> products
                </Pagination.Summary>

                <Pagination.Content className="flex items-center gap-1">
                  <Pagination.Item>
                    <Pagination.Previous
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === 1 || isPending}
                      onPress={() => updateParams({ page: String(page - 1) })}
                    >
                      <Pagination.PreviousIcon />
                      <span>Prev</span>
                    </Pagination.Previous>
                  </Pagination.Item>

                  {getPageNumbers().map((p, i) =>
                    p === "ellipsis" ? (
                      <Pagination.Item key={`ellipsis-${i}`}>
                        <Pagination.Ellipsis className="px-2 text-[var(--foreground-muted)] select-none text-xs" />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          isDisabled={isPending}
                          onPress={() => updateParams({ page: String(p) })}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p === page
                              ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm shadow-primary/30"
                              : "hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]"
                          }`}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}

                  <Pagination.Item>
                    <Pagination.Next
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === totalPages || isPending}
                      onPress={() => updateParams({ page: String(page + 1) })}
                    >
                      <span>Next</span>
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </Card>
      )}

      {/* Edit Product Modal — the same shared form the vendor desk uses */}
      <ProductEditModal
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
        product={editingProduct}
        categories={categories}
        subcategories={subcategories}
        mode="admin"
        onSave={async (id, payload) => {
          const res = await updateProduct(id, payload as unknown as Record<string, unknown>);
          if (res?.success !== false) {
            toast.success("Product updated successfully!");
            setProducts((prev) =>
              prev.map((p) => {
                if ((p.id || (p as any)._id) !== id) return p;
                return {
                  ...p,
                  ...(payload as unknown as Partial<Product>),
                  categories: payload.categoryId
                    ? [categories.find((c) => (c._id || c.id) === payload.categoryId)?.name || ""]
                    : p.categories,
                };
              })
            );
            router.refresh();
          }
          return res;
        }}
      />

      {/* ════════════════════════════════════════════════════════
          REJECT LISTING MODAL (review desk)
      ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={Boolean(rejectingProduct)}
        onOpenChange={(open) => {
          if (!open && !isRejecting) setRejectingProduct(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <XCircle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-[var(--foreground)]">
                  Send this listing back?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  <span className="font-bold text-[var(--foreground)]">
                    &ldquo;{rejectingProduct?.title}&rdquo;
                  </span>{" "}
                  stays off the shop, and the seller sees your reason before they fix it and
                  resubmit.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--foreground)]">
                  Reason for rejection
                </label>
                <TextArea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. The main photo shows the wrong item — add a clear photo of the product itself."
                  rows={3}
                  className="w-full rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs border border-[var(--border-color)] px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                />
                <p className="text-[10px] text-[var(--foreground-muted)]">
                  At least 5 characters. This is stored with the listing and notified to the seller.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onPress={() => setRejectingProduct(null)}
                  isDisabled={isRejecting}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmReject}
                  isDisabled={isRejecting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {isRejecting ? "Sending back..." : "Reject listing"}
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-[var(--foreground)]">
                  Delete Product?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    &ldquo;{deletingProduct?.title}&rdquo;
                  </span>
                  ? This action cannot be undone and the product owner will receive a notification.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onPress={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  isDisabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
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
