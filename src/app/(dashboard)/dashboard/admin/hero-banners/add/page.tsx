import React from "react";
import { getAdminBanners } from "@/lib/api/banners";
import { getProducts } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { asStoreList, getAllStores } from "@/lib/api/vendorStore";
import { getVendorPlanWindows } from "@/lib/api/promotions";
import HeroBannerForm from "../HeroBannerForm";

export const dynamic = "force-dynamic";

export default async function AddHeroBannerPage() {
  const [bannersRes, productsRes, categoriesRes, storesRes, windowsRes] = await Promise.all([
    getAdminBanners(),
    getProducts({ limit: 1000 }, { admin: true }),
    getCategories(),
    getAllStores({ limit: 100 }),
    getVendorPlanWindows(),
  ]);

  const banners = Array.isArray(bannersRes?.data) ? bannersRes.data : [];
  const products = productsRes?.data?.products ?? [];
  const categories = Array.isArray(categoriesRes?.data) ? categoriesRes.data : [];
  const stores = asStoreList(storesRes)?.stores ?? [];
  const vendorPoints = Object.fromEntries(
    windowsRes.map((w) => [w.vendorId, w.placementPoints])
  );

  return (
    <HeroBannerForm
      mode="create"
      defaultOrder={banners.length}
      products={products}
      categories={categories}
      stores={stores}
      vendorPoints={vendorPoints}
    />
  );
}
