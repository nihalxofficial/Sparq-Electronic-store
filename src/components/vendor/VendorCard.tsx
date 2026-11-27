"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, Crown, MapPin, Package, Star, Store } from "lucide-react";
import type { PublicStore } from "@/types/stores";

/**
 * One shop, drawn the same everywhere it appears.
 *
 * The home rail, the vendor directory and a product page's "sold by" block all
 * read the same public row, so they all get the same card: a cover, the
 * signboard, and the four numbers the platform keeps honest — rating, reviews,
 * parcels delivered and how many of them actually arrived.
 *
 * `compact` drops the description and the location for narrow side rails; it
 * never hides a number, because the numbers are the reason to trust the shop.
 */
export default function VendorCard({
  vendor,
  compact = false,
}: {
  vendor: PublicStore;
  compact?: boolean;
}) {
  const location = [vendor.address.area, vendor.address.city].filter(Boolean).join(", ");

  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="group relative flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] overflow-hidden shadow-2xs hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/50 hover:border-primary/40 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
    >
      {/* Cover, or the gradient the shop would have painted */}
      <div className="relative shrink-0 aspect-[3/1] bg-brand-gradient overflow-hidden">
        {vendor.coverImage && (
          <Image
            src={vendor.coverImage}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Scrim, so the badge and the signboard stay legible over any artwork */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />

        {vendor.isFeatured && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/95 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm backdrop-blur-sm">
            <Crown className="w-2.5 h-2.5" /> Featured
          </span>
        )}

        {/* Logo sitting on the cover's bottom edge */}
        <div
          className={`absolute left-4 rounded-2xl border-2 border-[var(--surface-elevated)] bg-[var(--surface-elevated)] overflow-hidden shadow-md flex items-center justify-center ${
            compact ? "-bottom-5 w-12 h-12" : "-bottom-6 w-14 h-14"
          }`}
        >
          {vendor.logo ? (
            <Image
              src={vendor.logo}
              alt={`${vendor.name} logo`}
              fill
              sizes={compact ? "48px" : "56px"}
              className="object-contain p-1"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Store className={`text-[var(--foreground-muted)] ${compact ? "w-5 h-5" : "w-6 h-6"}`} />
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col gap-1.5 px-4 sm:px-5 pb-3 ${compact ? "pt-7" : "pt-9"}`}>
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`font-extrabold text-[var(--foreground)] leading-snug line-clamp-1 group-hover:text-primary transition-colors ${
              compact ? "text-sm" : "text-base"
            }`}
          >
            {vendor.name}
          </h3>
          {vendor.category && (
            <span className="mt-0.5 shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
              {vendor.category}
            </span>
          )}
        </div>

        {!compact && vendor.description && (
          <p className="text-[11px] text-[var(--foreground-muted)] line-clamp-2 leading-relaxed">
            {vendor.description}
          </p>
        )}

        {!compact && location && (
          <p className="text-[10px] text-[var(--foreground-muted)] inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {location}
          </p>
        )}

        {/* The numbers, gathered into one honest strip */}
        <div className="mt-auto pt-3">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] px-3 py-2 text-[10px] sm:text-[11px] text-[var(--foreground-muted)]">
            <span className="inline-flex items-center gap-1 font-bold text-amber-500">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {vendor.rating > 0 ? vendor.rating.toFixed(1) : "New"}
            </span>
            {vendor.reviewCount > 0 && (
              <span className="hidden sm:inline">
                {vendor.reviewCount} review{vendor.reviewCount === 1 ? "" : "s"}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Package className="w-3 h-3" />
              {vendor.productCount}
            </span>
            {vendor.successRate > 0 && (
              <span
                className="ml-auto inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400"
                title="Delivered parcels against every parcel the shop closed"
              >
                <BadgeCheck className="w-3 h-3" />
                {vendor.successRate}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Footer call to the shop, always there, brightening on hover */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border-color)] px-4 sm:px-5 py-2.5 text-[11px] font-bold text-[var(--foreground-muted)] transition-colors group-hover:bg-primary/5 group-hover:text-primary">
        Visit shop
        <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
