"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Compass,
  Lock,
  Package,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Truck,
  User,
  Zap,
} from "lucide-react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { normalizeImageUrl } from "@/lib/imageUrl";

type SectionKind = "catalog" | "product" | "cart" | "dashboard" | "generic";

function getPageContext(pathname: string | null): {
  label: string;
  Icon: typeof Zap;
  kind: SectionKind;
} {
  if (!pathname || pathname === "/") return { label: "Storefront", Icon: Store, kind: "catalog" };
  if (pathname.startsWith("/shop/")) return { label: "Product Details", Icon: Package, kind: "product" };
  if (pathname.startsWith("/shop")) return { label: "Products Catalog", Icon: ShoppingBag, kind: "catalog" };
  if (pathname.startsWith("/vendors")) return { label: "Vendors", Icon: Store, kind: "catalog" };
  if (pathname.startsWith("/cart")) return { label: "Shopping Cart", Icon: ShoppingCart, kind: "cart" };
  if (pathname.startsWith("/checkout")) return { label: "Secure Checkout", Icon: Lock, kind: "cart" };
  if (pathname.startsWith("/order-success")) return { label: "Order Receipt", Icon: Sparkles, kind: "cart" };
  if (pathname.startsWith("/track-order")) return { label: "Order Tracking", Icon: Truck, kind: "dashboard" };
  if (pathname.startsWith("/store-locator")) return { label: "Store Locator", Icon: Compass, kind: "generic" };
  if (pathname.startsWith("/dashboard/admin")) return { label: "Admin Panel", Icon: BarChart3, kind: "dashboard" };
  if (pathname.startsWith("/dashboard/vendor")) return { label: "Vendor Studio", Icon: Store, kind: "dashboard" };
  if (pathname.startsWith("/dashboard/customer")) return { label: "My Dashboard", Icon: User, kind: "dashboard" };
  if (pathname.startsWith("/dashboard")) return { label: "Dashboard", Icon: BarChart3, kind: "dashboard" };
  if (pathname.startsWith("/auth/")) return { label: "Account Access", Icon: Lock, kind: "generic" };
  return { label: "Loading", Icon: Zap, kind: "generic" };
}

const SECTION_LINES: Record<SectionKind, string[]> = {
  catalog: [
    "Curating live marketplace collections",
    "Syncing real-time prices & stock across sellers",
  ],
  product: [
    "Loading full specifications & media",
    "Verifying live stock and active deals",
  ],
  cart: [
    "Preparing your basket summary",
    "Validating coupons, points & shipping rates",
  ],
  dashboard: [
    "Compiling live orders & analytics",
    "Syncing financial records & metrics",
  ],
  generic: ["Preparing your experience"],
};

function siteLines(siteName: string): string[] {
  return [
    `${siteName} — verified sellers, transparent pricing`,
    "Every price and discount verified in real time",
    "Tracked from warehouse shelf to your doorstep",
    "Seamless multi-vendor checkout & order protection",
  ];
}

export default function Loading() {
  const { settings } = useSiteSettings();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(8);
  const [tick, setTick] = useState(0);
  const [logoSrc, setLogoSrc] = useState<string>("");
  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setMounted(true);

    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 92) {
          clearInterval(progressTimer);
          return prev;
        }
        const jump = prev < 45 ? 6.5 : prev < 75 ? 2.8 : 0.7;
        return Math.min(prev + jump, 92);
      });
    }, 85);

    const lineTimer = setInterval(() => setTick((t) => t + 1), 2100);

    return () => {
      clearInterval(progressTimer);
      clearInterval(lineTimer);
    };
  }, []);

  const siteName = settings.siteName?.trim() || "Sparq";
  const siteTagline = settings.siteTagline?.trim() || "Better products. A brighter you.";

  // The mark in the ring: the site icon first, then the navbar logo. The URL is
  // normalised so an ImgBB *page* link is unwrapped to its direct image, which is
  // what stops a placeholder from appearing instead of the artwork.
  const resolvedLogo = normalizeImageUrl(
    settings.faviconUrl || settings.navbarLogo?.light || settings.navbarLogo?.dark || ""
  );
  // A .ico cannot be styled or sized reliably inside this glass tile, so it (and
  // a missing/blank logo) falls through to the animated mark below.
  const isIco = /\.ico(\?|#|$)/i.test(resolvedLogo);

  useEffect(() => {
    setLogoSrc(resolvedLogo);
    setLogoFailed(false);
  }, [resolvedLogo]);

  const activeLogo = logoSrc || resolvedLogo;
  const showLogo = Boolean(activeLogo) && !logoFailed && !isIco;
  const { label: pageLabel, Icon, kind } = mounted
    ? getPageContext(pathname)
    : { label: "Loading", Icon: Zap, kind: "generic" as SectionKind };

  const pool = [...SECTION_LINES[kind], ...siteLines(siteName)];
  const currentLine = pool[tick % pool.length];
  const nextLine = pool[(tick + 1) % pool.length];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[var(--background)] flex items-center justify-center select-none px-4">
      {/* Ambient Aurora Mesh */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[420px] rounded-full blur-[130px] pointer-events-none animate-[loaderAurora_6s_ease-in-out_infinite]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--primary) 26%, transparent), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-36 right-1/4 h-[340px] w-[340px] rounded-full blur-[120px] pointer-events-none animate-[loaderAurora_8s_ease-in-out_infinite_reverse]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--accent, var(--primary)) 18%, transparent), transparent 72%)",
        }}
      />

      {/* Precision Radial Dot Matrix */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06] dark:opacity-[0.09]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, var(--foreground) 1px, transparent 0)",
          backgroundSize: "24px 24px",
          WebkitMaskImage:
            "radial-gradient(circle at 50% 48%, #000 0%, transparent 65%)",
          maskImage:
            "radial-gradient(circle at 50% 48%, #000 0%, transparent 65%)",
        }}
      />

      {/* Frosted Center Stage */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-[var(--border-color)]/80 bg-[var(--surface-elevated)]/80 backdrop-blur-2xl p-8 shadow-2xl flex flex-col items-center gap-6 animate-[popIn_0.35s_ease-out_both]">
        {/* Top subtle sheen */}
        <div
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 55%, white), transparent)",
          }}
        />

        {/* Orbital Brand Core */}
        <div className="relative flex h-28 w-28 items-center justify-center animate-[loaderFloat_4s_ease-in-out_infinite]">
          {/* Soft halo */}
          <div className="absolute inset-2 rounded-full bg-primary/15 blur-xl animate-pulse" />

          {/* Outer orbital ring with glowing dot */}
          <svg
            className="absolute inset-0 h-full w-full animate-[spin_4s_linear_infinite]"
            viewBox="0 0 120 120"
            fill="none"
          >
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="var(--border-color)"
              strokeWidth="1.25"
              strokeOpacity="0.6"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="var(--primary)"
              strokeWidth="2.5"
              strokeDasharray="68 272"
              strokeLinecap="round"
            />
            <circle cx="60" cy="6" r="3.2" fill="var(--primary)" />
          </svg>

          {/* Inner counter-rotating precision arc */}
          <svg
            className="absolute h-20 w-20 animate-[spin_2.6s_linear_infinite_reverse]"
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="var(--primary)"
              strokeWidth="1.8"
              strokeDasharray="16 14"
              strokeOpacity="0.35"
              strokeLinecap="round"
            />
          </svg>

          {/* Center Brand Tile */}
          <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-lg ring-1 ring-primary/15">
            <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent animate-[shimmer_2.2s_infinite]" />
            {showLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeLogo}
                alt={siteName}
                className="h-full w-full object-contain p-2 drop-shadow-xs"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              // A brand-neutral animated mark: shown when there is no usable
              // favicon, it is a .ico, or the image failed to load — it fits any
              // kind of site instead of guessing with a letter.
              <div className="relative flex h-full w-full items-center justify-center bg-brand-gradient text-[var(--on-grad-text)]">
                <Zap className="h-6 w-6 animate-[pulse_1.5s_ease-in-out_infinite]" />
                <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/25" />
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
              </div>
            )}
          </div>
        </div>

        {/* Site Name + Custom Brand Signature + Live Context Pill */}
        <div className="flex flex-col items-center gap-2.5 text-center">
          <div className="flex flex-col items-center gap-1">
            <div className="inline-flex items-center gap-2">
              <span className="h-px w-5 bg-gradient-to-r from-transparent to-primary/60" />
              <h1 className="bg-brand-gradient bg-clip-text text-transparent text-2xl font-black tracking-tight">
                {siteName}
              </h1>
              <span className="h-px w-5 bg-gradient-to-l from-transparent to-primary/60" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--foreground-muted)]/85">
              {siteTagline}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface)]/90 px-3.5 py-1.5 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <Icon className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold tracking-wide text-[var(--foreground)]">
              Opening {pageLabel}
            </span>
          </div>
        </div>

        {/* Rotating Status Lines */}
        <div className="flex min-h-[3.25rem] w-full flex-col items-center justify-center gap-1 text-center">
          <p
            key={`cur-${tick}`}
            className="animate-[loaderLineIn_0.5s_ease-out_both] text-xs font-semibold text-[var(--foreground)]"
          >
            {currentLine}
          </p>
          <p
            key={`next-${tick}`}
            className="animate-[loaderLineIn_0.5s_ease-out_both] text-[11px] text-[var(--foreground-muted)]"
            style={{ animationDelay: "90ms" }}
          >
            {nextLine}
          </p>
        </div>

        {/* Shimmering Progress Track */}
        <div className="w-full space-y-1.5">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
            <div
              className="relative h-full rounded-full transition-all duration-300 ease-out overflow-hidden"
              style={{
                width: `${progress}%`,
                background:
                  "linear-gradient(90deg, var(--primary), var(--accent, var(--primary)))",
                boxShadow: "0 0 10px color-mix(in srgb, var(--primary) 60%, transparent)",
              }}
            >
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent animate-[shimmer_1.4s_infinite]" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--foreground-muted)]">
            <span>Securing connection</span>
            <span className="font-mono">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
