export interface ProductFinancialRow {
  productId: string;
  title: string;
  quantity: number;
  vendorId: string | null;
  storeId: string | null;
  ownerLabel: string;
  originalUnitPrice: number;
  soldUnitPrice: number;
  originalTotal: number;
  soldTotal: number;
  productDiscount: number;
  couponDiscountAllocated: number;
  pointsRedeemedAllocated: number;
  pointsValueAllocated: number;
  finalCustomerPaid: number;
  unitCost: number | null;
  totalCost: number | null;
  commissionPercent: number;
  platformCommission: number;
  riderPayoutShare: number;
  riderPayoutPayer: "Admin" | "Vendor" | "Admin (Plan Covered)" | "None";
  profitBeforeDiscounts: number | null;
  profitAfterDiscounts: number | null;
}

export interface OrderFinancialBreakdown {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  orderStatus: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  couponCode: string;
  pointsRedeemed: number;
  originalTotalProductPrice: number;
  totalProductDiscounts: number;
  soldSubtotal: number;
  couponDiscount: number;
  pointsDiscount: number;
  deliveryCharge: number;
  riderPayout: number;
  riderPayoutPayer: "Admin" | "Vendor" | "Shared (Admin & Vendor)" | "Admin (Plan Covered)" | "None";
  adminRiderPayout: number;
  vendorRiderPayout: number;
  platformCommissionTotal: number;
  totalCost: number | null;
  missingCostCount: number;
  finalCustomerPaid: number;
  expectedProfitWithoutDiscounts: number | null;
  expectedProfitWithDiscounts: number | null;
  adminProfit?: number | null;
  vendorProfit?: number | null;
  moneyFlow: {
    customerPaid: number;
    toVendors: number;
    toRiders: number;
    toPlatform: number;
    productCost: number | null;
  };
  items: ProductFinancialRow[];
}

export interface FinancialAnalyticsSummary {
  ordersCount: number;
  originalTotalProductPrice: number;
  totalProductDiscounts: number;
  totalCouponDiscount: number;
  totalPointsDiscount: number;
  totalDeliveryCharge: number;
  totalRiderPayout: number;
  totalAdminRiderPayout: number;
  totalVendorRiderPayout: number;
  totalPlatformCommission: number;
  totalCost: number;
  totalCustomerPaid: number;
  totalProfitWithoutDiscounts: number;
  totalProfitWithDiscounts: number;
  totalAdminProfit?: number;
  totalVendorProfit?: number;
}

export interface OrderFinancialAnalyticsResponse {
  days: number;
  plan?: { id: string; name: string };
  summary: FinancialAnalyticsSummary;
  orders: OrderFinancialBreakdown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
