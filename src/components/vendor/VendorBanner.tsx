"use client";

import { useState } from "react";
import { Crown, ExternalLink, Globe, MapPin, Maximize2, Store } from "lucide-react";
import ImageGalleryModal from "@/components/shared/ImageGalleryModal";
import StoreImage from "./StoreImage";
import type { PublicStore } from "@/types/stores";

/**
 * The storefront's front door: the cover, the signboard and the links that
 * leave the site.
 *
 * Both pictures open the same gallery — the cover arrives cropped to the band
 * it was painted for, and a logo is drawn fitted inside its frame, so the
 * full-size view is the only place either is read whole.
 */
export default function VendorBanner({ store }: { store: PublicStore }) {
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Cover first, then the sign — the order the page presents them in.
  const photos = [store.coverImage, store.logo].filter(Boolean);

  const openGallery = (src: string) => {
    const index = photos.indexOf(src);
    if (index < 0) return;
    setGalleryIndex(index);
    setGalleryOpen(true);
  };

  // No brand glyphs in this icon set, so the network's name is the label and
  // every social row shares one honest "leave the site" icon.
  const socials = [
    { key: "facebook", label: "Facebook", href: store.socialLinks.facebook },
    { key: "instagram", label: "Instagram", href: store.socialLinks.instagram },
    { key: "x", label: "X", href: store.socialLinks.x },
    { key: "linkedin", label: "LinkedIn", href: store.socialLinks.linkedin },
  ].filter((social) => Boolean(social.href));

  const where = [store.address.area, store.address.city, store.address.division]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <div className="rounded-3xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {/* ── Cover, opening the shop's photos ──
            The frame is the recommended 3:1 (1200×400), so a cover uploaded at
            that size fills it exactly instead of being cropped. */}
        <div className="relative aspect-[3/1] bg-brand-gradient">
          {store.coverImage && (
            <button
              type="button"
              onClick={() => openGallery(store.coverImage)}
              aria-label={`View ${store.name} photos`}
              className="group/cover absolute inset-0 block w-full h-full cursor-zoom-in"
            >
              <StoreImage
                src={store.coverImage}
                alt={`${store.name} cover`}
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover transition-transform duration-500 group-hover/cover:scale-[1.02]"
              />
              <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/cover:bg-black/25 transition-colors">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 backdrop-blur-sm group-hover/cover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3 h-3" />
                  View photos
                </span>
              </span>
            </button>
          )}
          {store.isFeatured && (
            <span className="pointer-events-none absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              <Crown className="w-3 h-3" /> Featured vendor
            </span>
          )}
        </div>

        <div className="px-5 md:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-14">
            {/* ── The sign, fitted whole inside its frame ── */}
            {store.logo ? (
              <button
                type="button"
                onClick={() => openGallery(store.logo)}
                aria-label={`View ${store.name} logo full-size`}
                className="group/logo relative w-20 h-20 md:w-28 md:h-28 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-md overflow-hidden flex items-center justify-center shrink-0 cursor-zoom-in"
              >
                <StoreImage
                  src={store.logo}
                  alt={`${store.name} logo`}
                  fill
                  sizes="112px"
                  className="object-contain p-1.5"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover/logo:opacity-100 transition-opacity">
                  <Maximize2 className="w-5 h-5 text-white" />
                </span>
              </button>
            ) : (
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-md overflow-hidden flex items-center justify-center shrink-0">
                <Store className="w-8 h-8 text-[var(--foreground-muted)]" />
              </div>
            )}

            <div className="flex-1 min-w-0 sm:pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                  {store.name}
                </h1>
                {store.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                    {store.category}
                  </span>
                )}
              </div>
              {where && (
                <p className="text-xs text-[var(--foreground-muted)] mt-1 inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {where}
                  {store.address.country ? `, ${store.address.country}` : ""}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:pb-1">
              {store.website && (
                <a
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-[11px] font-semibold text-[var(--foreground)] hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
              {socials.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${store.name} on ${social.key}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-[11px] font-semibold text-[var(--foreground)] hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          {store.description && (
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed mt-4 max-w-3xl">
              {store.description}
            </p>
          )}
        </div>
      </div>

      <ImageGalleryModal
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        images={photos}
        initialIndex={galleryIndex}
        productTitle={`${store.name} photos`}
      />
    </>
  );
}
