"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import type { Banner } from "@/types/banner";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { hasOfferDiscount } from "@/lib/offer";
import { padCountdown } from "@/lib/countdown";
import { useCountdown } from "@/hooks/useCountdown";

// Fallback used when a banner's image fails to load, so the hero never shows a
// broken frame.
const FALLBACK_IMAGE =
  "https://i.ibb.co.com/Q3Tpt7Df/industries-consumer-electronics-removebg-preview.png";

/** One small box of the offer timer. */
function TimerBox({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex min-w-[38px] shrink-0 flex-col items-center justify-center rounded-md bg-black/50 border border-white/25 px-1.5 py-1 shadow-sm backdrop-blur-xs">
      <span className="text-sm font-extrabold leading-none tabular-nums text-white">{padCountdown(value)}</span>
      <span className="mt-0.5 text-[8px] font-bold uppercase leading-none text-white/85">{label}</span>
    </span>
  );
}

interface HeroSliderProps {
  initialBanners?: Banner[];
}

/** Renders the admin's banners. Only eligible ones ever reach here. */
export default function HeroSlider({ initialBanners = [] }: HeroSliderProps) {
  const { formatPrice } = useSiteSettings();
  const banners = Array.isArray(initialBanners) ? initialBanners.filter((b) => b.href) : [];
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const id = setInterval(() => setCurrent((p) => (p + 1) % banners.length), 5000);
    return () => clearInterval(id);
  }, [isPaused, banners.length]);

  // Keep the index valid if the list shrank between renders.
  const index = current < banners.length ? current : 0;
  const banner = banners[index];

  // Pricing + timer for a product banner. Hooks run every render, before any
  // early return, so the order is stable.
  const product = banner?.product ?? null;
  const offerEnd = product?.offerEndDate ?? null;
  const countdown = useCountdown(offerEnd ?? undefined);
  const hasDiscount = hasOfferDiscount(product?.price, product?.originalPrice);
  const live = hasDiscount && !countdown.ended;
  const currentPrice = live ? product!.price : product?.originalPrice ?? product?.price ?? 0;
  const showStrike = live && Number(product?.originalPrice) > Number(product?.price);
  const showTimer = live && !!offerEnd && !countdown.ended;

  if (banners.length === 0) {
    return (
      <div className="w-full">
        <div className="relative bg-[var(--surface-elevated)] rounded-2xl overflow-hidden border border-[var(--border-color)] p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[320px] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-xl font-extrabold text-[var(--foreground)]">Discover Exclusive Deals</h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Browse our complete catalog of products, new arrivals, and top accessories.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 transition-all"
          >
            <span>Explore Shop</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const go = (dir: number) => setCurrent((p) => (p + dir + banners.length) % banners.length);

  return (
    <div className="w-full">
      <div
        className="relative rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-xs bg-[var(--surface-elevated)]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Each banner is absolutely stacked so the cross-fade is a pure opacity change.
            The frame follows the recommended upload size (960×600 on phones,
            1920×700 on wider screens), so a banner uploaded at that size fills it
            exactly instead of being cropped. */}
        <div className="relative aspect-[960/600] sm:aspect-[1920/700]">
          {banners.map((b, i) => {
            const active = i === index;
            return (
              <Link
                key={b.id}
                href={b.href}
                aria-hidden={!active}
                className={`absolute inset-0 block transition-opacity duration-700 ${
                  active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <picture>
                  {b.mobileImage && <source media="(max-width: 640px)" srcSet={b.mobileImage} />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={b.desktopImage || FALLBACK_IMAGE}
                    alt={b.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      if (e.currentTarget.src !== FALLBACK_IMAGE) {
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                </picture>

                {/* One light overlay, left → right: the site's colour behind the
                    words fades to the artwork on the right, so image and text
                    stay balanced. Dark mode uses the same shape in black. */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-flat)]/65 via-[var(--brand-flat)]/25 to-transparent dark:from-black/65 dark:via-black/30 dark:to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 md:p-14">
                  <div className="max-w-xl">
                    <h3 className="text-2xl md:text-4xl lg:text-5xl font-extrabold leading-tight text-white drop-shadow-sm">
                      {b.title}
                    </h3>
                    {b.subtitle && (
                      <p className="mt-2 text-xs md:text-sm font-medium text-white/90 max-w-md">{b.subtitle}</p>
                    )}

                    {/* Product pricing + offer timer */}
                    {b.type === "product" && product && (
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <span className="text-2xl md:text-3xl font-extrabold text-white drop-shadow-sm">
                          {formatPrice(currentPrice)}
                        </span>
                        {showStrike && (
                          <span className="text-sm md:text-base text-white/70 line-through">
                            {formatPrice(Number(product.originalPrice))}
                          </span>
                        )}
                        {showTimer && (
                          <div className="flex items-center gap-1.5">
                            {countdown.days > 0 && <TimerBox value={countdown.days} label="DAYS" />}
                            <TimerBox value={countdown.hours} label="HRS" />
                            <TimerBox value={countdown.minutes} label="MIN" />
                            <TimerBox value={countdown.seconds} label="SEC" />
                          </div>
                        )}
                      </div>
                    )}

                    <span className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-md shadow-primary/25">
                      {b.ctaText || "Shop Now"}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Controls */}
        {banners.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous banner"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white backdrop-blur-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next banner"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 hover:bg-black/55 text-white backdrop-blur-xs transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to banner ${i + 1}`}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    i === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
