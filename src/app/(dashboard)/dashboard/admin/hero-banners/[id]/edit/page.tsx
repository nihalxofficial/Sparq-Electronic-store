import React from "react";
import { notFound } from "next/navigation";
import { getAdminBanners } from "@/lib/api/banners";
import { getProducts } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { asStoreList, getAllStores } from "@/lib/api/vendorStore";
import { getVendorPlanWindows } from "@/lib/api/promotions";
import HeroBannerForm from "../../HeroBannerForm";

export const dynamic = "force-dynamic";

interface EditHeroBannerPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditHeroBannerPage({ params }: EditHeroBannerPageProps) {
  const { id } = await params;

  const [bannersRes, productsRes, categoriesRes, storesRes, windowsRes] = await Promise.all([
    getAdminBanners(),
    getProducts({ limit: 1000 }, { admin: true }),
    getCategories(),
    getAllStores({ limit: 100 }),
    getVendorPlanWindows(),
  ]);

  const banners = Array.isArray(bannersRes?.data) ? bannersRes.data : [];
  const banner = banners.find((b) => b.id === id);

  if (!banner) {
    notFound();
  }

  const products = productsRes?.data?.products ?? [];
  const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];
  const stores = asStoreList(storesRes)?.stores ?? [];
  const vendorPlans = Object.fromEntries(
    windowsRes.map((w) => [w.vendorId, { plan: w.plan, points: w.placementPoints }])
  );

  return (
    <HeroBannerForm
      mode="edit"
      initialBanner={banner}
      products={products}
      categories={categories}
      stores={stores}
      vendorPlans={vendorPlans}
    />
  );
}
