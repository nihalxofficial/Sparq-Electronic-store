import { Suspense } from "react";
import HeroSlider from "@/components/homepage/HeroSlider";
import HeroSliderSkeleton from "@/components/homepage/HeroSliderSkeleton";
import CategoriesDropdown from "@/components/shared/CategoriesDropdown";
import PromoBanners from "@/components/homepage/PromoBanners";
import WarehouseDeals from "@/components/homepage/WarehouseDeals";
import MostSoldProducts from "@/components/homepage/MostSoldProducts";
import NewArrivals from "@/components/homepage/NewArrivals";
import FeaturedVendors from "@/components/vendor/FeaturedVendors";
import FeaturedProducts from "@/components/vendor/FeaturedProducts";
import { Product, Promo } from "@/types";
import PromoStrip from "@/components/homepage/PromoStrip";
import Brand from "@/components/homepage/Brand";
import { getProducts } from "@/lib/api/products";
import { asStoreList, getPublicStores } from "@/lib/api/stores";
import { getBanners } from "@/lib/api/banners";
import { getPromos } from "@/lib/api/promos";

// The two promo blocks are not defined here any more: their words, images and
// links are rows in the `promos` collection, written in Admin → Promo Banners,
// so the homepage never carries artwork or prices that belong to a different
// kind of store.

// ─── Per-section async server components ─────────────────────────────────────

async function HeroSliderSection() {
  const res = await getBanners();
  const banners = Array.isArray(res?.data) ? res.data : [];

  return <HeroSlider initialBanners={banners} />;
}

async function NewArrivalsSection() {
  const res = await getProducts({ sort: "newest", limit: 14 });
  const products: Product[] = res?.data?.products ?? [];
  return <NewArrivals products={products} />;
}

// The units that actually moved: ranked by the sell counter the order pipeline
// keeps, so the shelf is what shoppers buy rather than a hand-picked label.
async function MostSoldSection() {
  const res = await getProducts({ sort: "sellCount", limit: 14 });
  const products: Product[] = res?.data?.products ?? [];
  return <MostSoldProducts products={products} />;
}

// The listings a running placement is lifting right now, read in the shelf's own
// paid order: the store's own stock first, then each seller by the plan behind
// its placement. Three rows' worth, so the shelf's "Show more" has somewhere to
// go. No placement running, no section.
async function FeaturedProductsSection() {
  const res = await getProducts({ isFeatured: true, sort: "featured", limit: 15 });
  const products: Product[] = res?.data?.products ?? [];
  return <FeaturedProducts products={products} />;
}

// The shops a storefront placement is lighting up, the freshest first.
//
// Only a placement on the shop itself puts it here — the one a paid period opens
// when the plan starts, or the one the store team grants from the promotions
// desk. A featured listing does not carry its seller along: the marquee is the
// shop's own row, so a shop appears because that row was bought or granted,
// never as a side effect of one of its products. Nothing placed, no section.
async function FeaturedVendorsSection() {
  const placedRes = await getPublicStores({ featured: true, sort: "latest", limit: 8 });
  // An API that predates the `latest` order answers nothing to this read, so
  // ask once more in the default order rather than lose the rail to a 400.
  const placed =
    asStoreList(placedRes) ?? asStoreList(await getPublicStores({ featured: true, limit: 8 }));

  return <FeaturedVendors vendors={placed?.stores ?? []} />;
}

// Reads the active "tile" banners. They are drawn two per row by PromoBanners.
async function PromoTilesSection() {
  const res = await getPromos({ isActive: "true", placement: "tile" });
  const banners: Promo[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
    ? res
    : [];

  return <PromoBanners banners={banners} />;
}

// The strip is a single band, so the first active "strip" banner wins
// (Promo always sorts by `order`, then newest first).
async function PromoStripSection() {
  const res = await getPromos({ isActive: "true", placement: "strip" });
  const banners: Promo[] = Array.isArray(res?.data)
    ? res.data
    : Array.isArray(res)
    ? res
    : [];

  return <PromoStrip strip={banners[0]} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      {/* ── Hero Section: Left Docked Categories & Right-Shifted Slider ── */}
      <section className="w-full max-w-7xl mx-auto my-6 relative z-30">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="hidden lg:block w-[270px] shrink-0 relative z-40">
            <CategoriesDropdown variant="docked" label="All Departments" />
          </div>
          <div className="flex-1 min-w-0 w-full relative z-10">
            <Suspense fallback={<HeroSliderSkeleton />}>
              <HeroSliderSection />
            </Suspense>
          </div>
        </div>
      </section>

      {/* Featured products — the paid placements, in the shelf's paid order */}
      <Suspense fallback={null}>
        <FeaturedProductsSection />
      </Suspense>

      <WarehouseDeals />

      {/* New Arrivals — shows skeleton while fetching */}
      <Suspense fallback={<NewArrivals loading />}>
        <NewArrivalsSection />
      </Suspense>

      {/* Promo tiles — the section disappears when no tile is active */}
      <Suspense fallback={null}>
        <PromoTilesSection />
      </Suspense>

      {/* Most sold — ranked by the units each product moved */}
      <Suspense fallback={<MostSoldProducts loading />}>
        <MostSoldSection />
      </Suspense>

      {/* Featured vendors — the last shelf before the wide promo strip */}
      <Suspense fallback={null}>
        <FeaturedVendorsSection />
      </Suspense>

      {/* Wide promo strip — also disappears when no strip banner is active */}
      <Suspense fallback={null}>
        <PromoStripSection />
      </Suspense>

      <Brand />
    </>
  );
}
