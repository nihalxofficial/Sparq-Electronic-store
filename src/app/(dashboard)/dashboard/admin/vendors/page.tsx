import React from "react";
import Link from "next/link";
import { Inbox, Store, Ticket } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asVendorBoard, getVendorBoard } from "@/lib/api/vendor";
import { getSiteSettings } from "@/lib/api/siteSettings";
import VendorsBoardClient from "./VendorsBoardClient";

export const dynamic = "force-dynamic";

/** The shop states, the marquee filter and the sort keys the URL may carry. */
const STATUS_CHOICES = ["all", "active", "suspended", "closed"];
const FEATURED_CHOICES = ["all", "yes", "no"];
const SORT_CHOICES = ["points", "sales", "subscription", "success", "products", "newest", "name"];

interface AdminVendorsPageProps {
  searchParams: Promise<{
    status?: string;
    plan?: string;
    featured?: string;
    sort?: string;
    search?: string;
    page?: string;
  }>;
}

/**
 * The store team's board of sellers.
 *
 * One table over every shop, ranked by the points the API reads from the same
 * ledger the seller's own dashboard uses: permanent plan-period awards plus
 * delivered units at the configured rate. The points are the order the desk
 * starts with, not a verdict — every other reading can be sorted by too.
 */
export default async function AdminVendorsPage({ searchParams }: AdminVendorsPageProps) {
  await getRequiredRole("admin");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const status = STATUS_CHOICES.includes(params?.status || "") ? params!.status! : "all";
  const featured = FEATURED_CHOICES.includes(params?.featured || "") ? params!.featured! : "all";
  const sort = SORT_CHOICES.includes(params?.sort || "") ? params!.sort! : "points";
  // A plan id is whatever the store team named the plan; a plain slug is enough
  // to tell a real filter from a hand-typed query.
  const plan = /^[a-z0-9_-]{1,40}$/i.test(params?.plan || "") ? params!.plan! : "all";
  const search = params?.search?.trim().slice(0, 60) || "";

  const [boardRes, settingsRes] = await Promise.all([
    getVendorBoard({ search, status, plan, featured, sort, page, limit: 20 }),
    getSiteSettings(),
  ]);

  const board = asVendorBoard(boardRes);

  if (!board) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Vendors</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The seller board could not be read just now.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
              <Store className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Nothing was changed</p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Every shop, plan and order is still where it was. Reload this board
                to read it again, or open the review queue to decide who trades
                next.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Link
                  href="/dashboard/admin/vendors/applications"
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
                >
                  <Inbox className="h-3.5 w-3.5" />
                  Vendor applications
                </Link>
                <Link
                  href="/dashboard/admin/coupons?owner=vendor"
                  className="inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
                >
                  <Ticket className="h-3.5 w-3.5" />
                  Seller codes
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <VendorsBoardClient
      result={board}
      filters={{ status, plan, featured, sort, search }}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
