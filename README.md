<div align="center">

# ⚡ Sparq

**Modern Electronics E-Commerce Platform**

Full-stack marketplace with multi-vendor support, loyalty system, and comprehensive admin controls

[![Live Demo](https://img.shields.io/badge/Demo-Live-success?style=flat-square)](https://sparq-electronics.vercel.app)
[![Frontend](https://img.shields.io/badge/Frontend-Next.js_16-black?style=flat-square&logo=next.js)](https://github.com/demoprojectbdsoft/Sparq-Electronics-Store)
[![Backend](https://img.shields.io/badge/Backend-Express_5-green?style=flat-square&logo=express)](https://github.com/demoprojectbdsoft/Sparq-Server)

</div>

---

## 📖 Table of Contents

1. [What is Sparq?](#what-is-sparq)
2. [Key Features](#key-features)
3. [How It Works](#how-it-works)
4. [Tech Stack](#tech-stack)
5. [Quick Start](#quick-start)
6. [Environment Setup](#environment-setup)
7. [Development](#development)
8. [Deployment](#deployment)
9. [Demo Accounts](#demo-accounts)
10. [Implementation Status](#implementation-status)
11. [Recent Changes](#recent-changes)
12. [Documentation](#documentation)

---

## What is Sparq?

Sparq is a **production-ready e-commerce platform** for electronics with complete multi-vendor marketplace capabilities. Everything is database-driven - no hardcoded content.

### At a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    SPARQ PLATFORM                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  👥 CUSTOMERS          🏪 VENDORS         👨‍💼 ADMIN          │
│  • Browse & Shop       • Sell Products   • Manage Platform │
│  • Track Orders        • Fulfillment     • Site Settings   │
│  • Reviews             • Analytics       • Reports         │
│  • Loyalty Points      • Coupons         • Users           │
│  • Coverage            • Promotions      • Support         │
│                                                             │
│  🛵 RIDERS             🧪 DEMO ADMIN                        │
│  • Deliveries          • Sandbox Mode                      │
│  • Earnings            • Auto-Restore                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Features

### 🛍️ For Customers

- **Smart Shopping**: Search, filters, comparison (up to 3 products)
- **Flexible Browsing**: Pagination OR infinite scroll
- **Checkout Options**: COD, bKash, Rocket, Nagad
- **Loyalty Rewards**: Earn & redeem points (1 point = $1 spent)
- **Order Tracking**: Real-time status with delivery map
- **Reviews**: Star ratings + photos
- **Warranties**: Coverage shown on each product page
- **Currency**: Prices show in the store's currency; the day's rates convert them for display
- **Saved Addresses**: Up to 5 addresses with default
- **Data Export**: Download your data as JSON — including your shop or rider file if you have one

### 🏪 For Vendors (Multi-Vendor)

- **Own Storefront**: Custom branding at `/stores/your-shop`
- **Product Management**: With plan limits (10/50/unlimited)
- **Order Fulfillment**: Accept → Process → Ready → Ship
- **Discount Coupons**: Create codes for your products
- **Featured Promotions**: Buy slots to feature products
- **Sales Analytics**: Revenue, top products, commission tracking
- **Subscription Plans**: Free, Basic ($29/mo), Pro ($99/mo)

### 🛵 For Riders

- **Delivery Jobs**: Accept requests, track deliveries
- **Live Tracking**: GPS location sharing
- **Earnings Dashboard**: Total, monthly, per-delivery stats
- **Order History**: Completed and cancelled deliveries

### 👨‍💼 For Admins

- **Complete Control**: Products, categories, orders, users
- **Hero Banners**: Product, category, vendor or custom hero banners — upload artwork (desktop + mobile, GIFs included), schedule, order and preview them without touching code
- **CMS Branding**: Logos, colors, fonts, content - no redeploy
- **User Management**: Role assignment, per-role suspension
- **Account Suspension**: Suspending an account parks its vendor/rider dashboards and takes a suspended seller's shop (and every product in it) off the storefront — listings, product page and checkout all refuse it
- **Vendor Control**: Approve applications, grant promotions
- **Support Tools**: Product review desk, reviews, contact messages
- **Reports & Analytics**: CSV + PDF exports with charts
- **Maintenance Mode**: Close site for customers, keep admin access

### 🧪 Demo Admin (Sandbox)

- **Same reach as a real admin**: every dashboard, every write
- **Every write is logged** and reverted by the nightly sweep
- **Auto Restore**: once a day at 00:00 (Asia/Dhaka), not a rolling timer
- **Never breaks real data**: a demo-created row another row depends on is kept, not deleted

---

## How It Works

### System Overview

```
Browser                    Frontend (Next.js)              Backend (Express)        Database
   │                              │                              │                      │
   │────── Login ────────────────►│                              │                      │
   │                              │──── Generate JWT ───────────►│                      │
   │                              │                              │                      │
   │◄──── JWT Token ──────────────│                              │                      │
   │                              │                              │                      │
   │────── Shop/Order ───────────►│                              │                      │
   │                              │──── API + JWT ──────────────►│                      │
   │                              │                              │──── Verify JWT ─────►│
   │                              │                              │                      │
   │                              │                              │◄──── User Data ──────│
   │                              │                              │                      │
   │                              │                              │──── Process ────────►│
   │                              │◄──── Response ───────────────│                      │
   │◄──── Display ────────────────│                              │                      │
```

### Authentication Flow

1. **User logs in** → Frontend (better-auth)
2. **JWT generated** → Stored in browser
3. **API request** → JWT sent with every request
4. **Backend verifies** → JWT via JWKS, or the session token as a fallback
5. **Authorization** → Role checked on every endpoint
6. **Fresh roles** → Always read from DB, never cached in token

### Order Processing

```
Place Order                                              Delivered
    │                                                         │
    ├─ Validate stock                                        ├─ Mark payment success
    ├─ Redeem points (atomic)                                ├─ Credit loyalty points
    ├─ Calculate totals (server-side)                        └─ Update sell counts
    ├─ Create order + payment
    ├─ Decrement stock (guarded)
    ├─ Clear cart
    └─ Split into vendor groups (if multi-vendor)

Status Flow:  confirmed → processing → shipped → delivered
                   │            │         │
                   └────────────┴─────────┴──────► cancelled
                       (cancelling refunds a paid order, restores stock,
                        returns points and the coupon's use)
```

### Multi-Vendor Order Splitting

When a customer orders from multiple vendors:

```
Customer Cart:
  - Product A (Vendor X)
  - Product B (Vendor X)  
  - Product C (Vendor Y)
  - Product D (Platform)
          │
          ▼
    One Payment
    One Order ID
          │
          ├──► VendorOrder (Vendor X) → Products A + B
          ├──► VendorOrder (Vendor Y) → Product C
          └──► Parent Order → Product D (platform stock)
```

Each vendor manages their own group independently, but delivery is coordinated by platform.

### Loyalty Points System

```
EARNING:  $147.50 order → 147 points credited on delivery
          (1 point per $1 spent, rounded down)

REDEMPTION: 100 points = $1 discount
            Minimum: 100 points
            Maximum: Product total (shipping always paid in cash)

TIERS:
  🥈 Silver:   0 - 999 points
  🥇 Gold:     1,000 - 3,999 points  
  💎 Platinum: 4,000 - 9,999 points
  💎 Diamond:  10,000+ points
```

### Currency & Display

The shop prices everything in **one** currency — the admin's choice in Settings
— and stores prices in it. The backend pulls the day's exchange rates once a day,
and the storefront uses them to **convert a price for display** when a different
currency is chosen: `convertCurrency(amount, base, display, rates)` then
`formatPrice(amount, currency)`.

The helpers live in `src/lib/currency.ts`:

```
formatPrice(amount, currency)   // symbol + the currency's own decimals (¥1,238, ৳1,240.00)
formatAmount(amount, symbol)    // the same, when you already hold a bare symbol
currencyDecimals(currency)      // JPY 0, USD 2, KWD 3
roundToCurrency(amount, currency)
convertCurrency(amount, from, to, rates)
```

No rates, or an unknown currency pair, leaves the number unchanged — so nothing
breaks before the first fetch.

### Hero Banners

The homepage hero is driven by banners written in Admin → Hero Banners. Each
banner is one image and one destination, and its `type` decides where the click
goes:

```
product   → /shop/<slug>            shows the product's price, discount and offer timer
category  → /shop?category=<slug>
vendor    → /vendors/<slug>
custom    → the URL you type in
```

- **Artwork** — a desktop image is required; a mobile image is optional and falls
  back to the desktop one. Images upload to ImgBB through the existing uploader,
  so PNG, JPG, WEBP and animated GIF all work. Suggested sizes: **1920 × 700**
  desktop, **960 × 600** mobile.
- **Overlay** — a light left-to-right gradient in the store's own colour
  (`--brand-flat`), fading to the artwork so image and text stay balanced; dark
  mode uses the same shape in black.
- **Product banners** show the selling price, the struck-through original and a
  live offer timer — only while an offer is actually running. With no offer the
  banner shows the selling price alone.
- **Publishing** — a publish switch plus start/end dates. Status is derived
  (draft / scheduled / active / expired), so it can never disagree with the
  clock. Display order is the admin's priority.
- **Homepage** — only published banners inside their date window are shown, in
  order, and a banner whose product, category or shop has since been removed is
  skipped.

Admin screens: `/dashboard/admin/hero-banners` (list) and `/add` · `/[id]/edit`
(the shared `HeroBannerForm`).

### Warranty (product info only)

Each product carries a coverage code — **Manufacturer**, **Seller**,
**Extended**, **Other** or **None** — plus a period in months and a terms line,
shown on the product page. There is **no claim workflow** in this build; one
shared list lives in `src/lib/warranty.ts`.

### Discount Coupons (Two-Level System)

```
ADMIN COUPONS (Store-Wide)          VENDOR COUPONS (Shop-Specific)
        │                                    │
        ├─ Any product/category              ├─ Only vendor's products
        ├─ Created by platform               ├─ Created by vendor
        └─ Applies to full cart              └─ Only their items discounted

Both types:
  • Percentage (1-100%) or Fixed amount
  • Optional: min order, max discount, usage limits
  • Date range with auto expiry
  • Per-customer limits
  • Cancelling an order returns the use (per-customer and total counters)

Vendor coupon control:
  • Seller (their coupons desk): create, edit, stop/resume and delete their codes
  • Store team: can only stop or put back a seller's code — never delete it
  • Admin coupon: the store bears the discount, the seller keeps full price
  • Vendor coupon: deducted from the seller's own order total (seller bears it)
```

### Dynamic Branding (CMS)

Everything controlled from admin dashboard:

```
SITE SETTINGS
  ├─ Identity: Name, tagline, SEO meta
  ├─ Typography: Google Fonts selection
  ├─ Theme: 8 industry palettes + custom color creator
  ├─ Logos: Light/dark variants, favicon
  ├─ Shipping: Fees, thresholds, delivery estimates
  ├─ Contact: Phone, email, hours, social links
  └─ System: Currency, timezone, maintenance mode

All changes take effect immediately - no redeploy needed.
```

---

## Tech Stack

### Frontend
- **Framework**: Next.js 16.2 (App Router), React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4, HeroUI v3
- **Auth**: better-auth 1.7 (JWT + MongoDB adapter)
- **Charts**: Recharts
- **PDF**: jsPDF (client-side)
- **Maps**: Leaflet + OpenStreetMap

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express 5.2
- **Language**: TypeScript (CommonJS)
- **Database**: MongoDB 7 + Mongoose 9
- **Validation**: Zod 4
- **Auth**: jose-cjs (JWKS verification)
- **Email**: Nodemailer (SMTP)
- **Jobs**: node-cron + Vercel Cron

### Infrastructure
- **Hosting**: Vercel (frontend + backend serverless)
- **Database**: MongoDB Atlas
- **Images**: ImgBB CDN
- **Email**: SMTP (Gmail compatible)

---

## Quick Start

### Prerequisites

```bash
✓ Node.js 20+
✓ MongoDB (Atlas or local)
✓ SMTP credentials (for emails)
✓ ImgBB API key (for uploads)
```

### 1. Clone & Install

```bash
# Clone frontend
git clone https://github.com/demoprojectbdsoft/Sparq-Electronics-Store.git
cd Sparq-Electronics-Store
npm install

# Clone backend (separate terminal)
git clone https://github.com/demoprojectbdsoft/Sparq-Server.git
cd Sparq-Server
npm install
```

### 2. Configure Backend First

Create `sparq-server/.env.local`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017
DATABASE=sparq

# Server
PORT=5000
NEXT_PUBLIC_CLIENT_URL=http://localhost:3000

# Security
INTERNAL_API_KEY=your_random_32_char_key_here
CRON_SECRET=your_random_32_char_key_here

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
MAIL_FROM=your-email@gmail.com

# Demo
DEMO_ADMIN_EMAIL=demoadmin@example.com
```

### 3. Configure Frontend

Create `sparq/.env.local`:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Auth
BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_SECRET=your_random_32_char_secret
JWT_SECRET=your_random_32_char_secret

# Database (same as backend)
MONGODB_URI=mongodb://localhost:27017
DATABASE=sparq

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Internal Key (MUST match backend)
INTERNAL_API_KEY=your_random_32_char_key_here

# Image Uploads
NEXT_PUBLIC_IMGBB_API_KEY=your_imgbb_api_key
```

### 4. Start Both Servers

```bash
# Terminal 1: Backend
cd sparq-server
npm run dev
# Runs at http://localhost:5000

# Terminal 2: Frontend  
cd sparq
npm run dev
# Runs at http://localhost:3000
```

### 5. Test It!

Open http://localhost:3000 and:
1. Register a customer account
2. Browse products
3. Add to cart & checkout
4. Check admin dashboard (create admin via MongoDB)

---

## Environment Setup

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:5000/api` |
| `BETTER_AUTH_SECRET` | Signs JWT tokens | 32+ random chars |
| `BETTER_AUTH_URL` | Frontend URL | `http://localhost:3000` |
| `MONGODB_URI` | MongoDB connection | `mongodb://localhost:27017` |
| `DATABASE` | Database name | `sparq` |
| `INTERNAL_API_KEY` | Shared with backend | Match backend value |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | Google OAuth ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `NEXT_PUBLIC_IMGBB_API_KEY` | Image uploads |

### Important Notes

- ⚠️ **Never commit `.env.local`** to git
- ⚠️ **`INTERNAL_API_KEY` must match backend** exactly
- ⚠️ **Rebuild after changing `NEXT_PUBLIC_*`** variables
- ⚠️ **Emails sent by backend** - configure SMTP there
- ⚠️ **Restrict `next/image` hosts** - `next.config.ts` currently allows any
  `https` host, so the image optimizer can fetch an arbitrary URL. Narrow
  `images.remotePatterns` to your own CDN/hosts before going live.
- ⚠️ **Keep the document URL the API returns** - application documents are read
  through a signed link, so store `payload.data.url` from `/api/documents`
  as-is instead of rebuilding it.

---

## Development

### Available Scripts

```bash
npm run dev          # Development server (port 3000)
npm run build        # Production build
npm start            # Production server
npm run lint         # ESLint
```

### Development Workflow

**Server Components** (default)
- Fetch data directly from API
- No client state management needed
- Example: Product listing, order history

**Client Components** (`"use client"`)
- Interactive UI elements
- Named `*Client.tsx` by convention
- Example: Cart button, wishlist toggle

**Server Actions** (`"use server"`)
- Handle mutations (add to cart, place order)
- Located in `lib/action/`
- Automatic revalidation

### Adding a Feature

1. Define types in `src/types/`
2. Create API client in `src/lib/api/` (if reading data)
3. Create server action in `src/lib/action/` (if mutating)
4. Build components in `src/components/`
5. Create page in `src/app/`
6. Add backend route (see backend README)

---

## Deployment

### Vercel (Recommended)

1. **Push to GitHub**
2. **Import to Vercel**
3. **Set environment variables** (all from `.env.local`)
4. **Deploy**

### Production Checklist

- [ ] Set production `NEXT_PUBLIC_API_URL`
- [ ] Generate strong `BETTER_AUTH_SECRET` and `JWT_SECRET`
- [ ] Configure MongoDB Atlas whitelist
- [ ] Set up Google OAuth (production credentials)
- [ ] Update `INTERNAL_API_KEY` (match backend)
- [ ] Test all user flows
- [ ] Verify maintenance mode works
- [ ] Check mobile responsiveness

### Important URLs

After deployment, update:
- `BETTER_AUTH_URL` → Your Vercel URL
- `NEXT_PUBLIC_API_URL` → Your backend URL
- Google OAuth redirect → Your Vercel URL

---

## Demo Accounts

### Test Users

**Customer**
- Register at `/auth/register`
- Full shopping experience

**Admin**
- Create via MongoDB:
  `db.user.updateOne({ email: "..." }, { $set: { role: "admin", activeRole: "admin", roles: ["admin"] } })`
- Access all dashboards

**Demo Admin**
- Email configured in backend `DEMO_ADMIN_EMAIL`
- Sandbox mode with auto-restore

**Vendor**
- Apply at `/become-a-vendor`
- Admin must approve application

### Test Payments

**Cash on Delivery**: settles at the door (starts `pending`)
**Mobile Wallets**: simulated — the site has no gateway. Type any 8–20 character
reference; it is stored with `isDemo` and cannot be reused on a second order.
Cancelling a paid order marks its payment **refunded**.

---

## Implementation Status

### ✅ Currently Implemented

| Feature | Status |
|---------|--------|
| **Core Platform** ||
| Public Storefront | ✅ Complete |
| Shopping Cart & Checkout | ✅ Complete |
| Customer Dashboard | ✅ Complete |
| Admin Dashboard | ✅ Complete |
| Dynamic CMS/Branding | ✅ Complete |
| Demo Admin Mode | ✅ Complete |
| **Loyalty & Points** ||
| Points System | ✅ Complete |
| Earn/Redeem at Checkout | ✅ Complete |
| Membership Tiers | ✅ Complete |
| **Marketplace** ||
| Multi-Vendor Platform | ✅ Complete |
| Vendor Dashboard | ✅ Complete |
| Subscription Plans | ✅ Complete |
| Order Splitting | ✅ Complete |
| Commission System | ✅ Complete |
| Subscription Renewals | ✅ Extend, never reset |
| Vendor & Rider Applications | ✅ Submit, review, approve |
| **Delivery** ||
| Rider Dashboard | ✅ Complete |
| Delivery Assignment | ✅ Complete |
| GPS Tracking + Door Code | ✅ Complete |
| **Marketing** ||
| Discount Coupons | ✅ Complete |
| Featured Promotions | ✅ Complete |
| Activity Notifications | ✅ Complete |
| **Money & Documents** ||
| Wallet Demo Payments | ✅ Simulated, refunded on cancel |
| Signed Document Links | ✅ Complete |

### 📋 Future Enhancements (On Demand)

| Feature | Description |
|---------|-------------|
| **Warranty Claims** | Full claim processing system |
| **Payment Gateways** | Stripe, SSLCommerz, cryptocurrency |
| **Real-Time** | WebSocket, live chat, push notifications |
| **Mobile Apps** | React Native (iOS + Android) |
| **Security** | Rate limiting, Helmet.js, Redis caching |
| **DevOps** | Docker, Kubernetes, CI/CD pipeline |
| **AI/ML** | Product recommendations, fraud detection |
| **International** | Multi-currency, i18n, global shipping |

---

## Recent Changes

- **Banner skeleton, loading mark & admin password:** the hero shows a shimmering skeleton until its art paints; the global loading mark normalises the icon URL and falls back to an animated mark when there is no usable favicon (or it is an .ico); admins can change their password in Settings → System & Security.
- **Images fit their frames:** hero banners, the store cover and vendor cards use the recommended upload ratio (1920×700 / 960×600 hero, 1200×400 cover), so an image uploaded at that size fills the frame instead of being cropped.
- **Express shipping:** free shipping is the standard method's perk only — express is always charged, even when the basket clears the free-shipping threshold.
- **Optional warranty:** an empty warranty period saves as No warranty with no error, and a product with no warranty shows no warranty rows.
- **Refund on any cancellation:** cancelling an order by anyone marks its payment refunded, not failed.
- **Frozen order figures:** commission, delivery cover and per-line cost are frozen at checkout, so a plan or cost change never re-prices a completed order.
- **Notifications don't delay an order:** the feed and mail fan-out runs after the response, so a slow inbox can't make a placed order look like a failure.
- **Clearer edit refusals:** a refused product save shows the server's reason, the admin can edit any listing, and a clashing slug answers 409.
- **Checkout:** the wallet fields are gone — pick a payment method on top, and pressing **Place Order** runs the animated gateway automatically and places the order.
- **One product edit modal:** the admin and the seller now share a single edit form, so a seller can set warranty, specifications, discount and offer dates exactly like the admin.
- **Order-level financial analytics & modal:** Admin and Premium/Advanced vendors get per-order and per-product financial breakdowns (original price, discounts, coupon/points allocations, cost, commission, rider payout responsibility, Admin/Vendor profit split, and before/after discount P/L) in a responsive HeroUI v3 modal, with strict backend plan gating and vendor isolation.
- **PDF & CSV financial exports:** Admin and eligible Vendor PDF and CSV analytics reports include order-level financial summaries and product-level calculation tables.
- **Strict coupon ownership:** Admin coupons only list, select, and apply to store-owned products (vendor products are excluded even on category selection); vendor coupons apply only to that vendor's products.
- **Product archive & delete permissions:** Admin can archive any product and delete only store-owned products (never vendor-owned); vendors can archive and permanently delete their own products. Archive ownership (`archivedBy`) prevents cross-unarchiving.
- **Decimal-safe financial precision:** Preserved decimal precision across pricing, analytics, payouts, and exports without intermediate rounding.
- **Rider code verification reliability:** Added timeout handling, duplicate-submit protection, and retry states on delivery OTP verification.
- **User order PDF invoice:** Fixed overlapping totals, added customer/rider/item-discount details, text wrapping, repeated table headers, and consistent multi-page footers.
- **Hero banners & promo images:** Moved hero banner add/edit to dedicated pages with searchable product/vendor pickers and HeroUI v3 date-time pickers; fixed promo banner image loading.
- **Cron on Vercel Hobby:** the backend runs one daily sweep (`/api/cron/daily`) instead of seven cron jobs, because Hobby allows only daily jobs.
- **Vendor storefront:** a products-first shop page — a sticky record column beside the shelf, three products per row.
- **Vendor directory cards:** bigger, clearer cards with a cover, an overlapping logo, a stats strip and a Visit-shop footer.
- **Shop record:** a seller's orders-completed and success rate are derived live from their order groups, so the storefront matches their board.
- **Store profile:** the vendor profile page rebalances into two columns instead of a short left column with empty space.
- **Global loading:** a context-aware loading screen that names the section being opened and rotates lines about it.
- **Customer cancel (limited):** a customer can cancel before an order ships and while no rider holds it.
- **Rider requests:** the request email is informational only; the delivery page shows a numbered collection route.
- **Warehouse required:** on every seller store profile and on the store-team admin profile.
- **Notification preferences:** an account-wide bell switch and email switch on every dashboard settings page.
- **Subscription payment:** a paid plan runs through the animated gateway flow.
- **Plan exports:** Premium exports **PDF**; Advanced exports **CSV + PDF**.

---

## Documentation

- **[Level 1 Docs](./docs/LEVEL-1-CORE-STORE.md)** - Core store features
- **[Level 2 Docs](./docs/LEVEL-2-GROWTH-STORE.md)** - Loyalty & growth
- **[Level 3 Docs](./docs/LEVEL-3-FULL-PLATFORM.md)** - Full marketplace
- **[Backend API](https://github.com/demoprojectbdsoft/Sparq-Server)** - API documentation

---

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/AmazingFeature`
3. Commit changes: `git commit -m 'Add AmazingFeature'`
4. Push to branch: `git push origin feature/AmazingFeature`
5. Open Pull Request

**Guidelines:**
- Follow existing code structure
- Use TypeScript with proper types
- Test thoroughly
- Update documentation

---

## Support & Links

- **Backend Docs**: [Sparq-Server README](https://github.com/demoprojectbdsoft/Sparq-Server)
- **Issues**: [GitHub Issues](https://github.com/demoprojectbdsoft/Sparq-Electronics-Store/issues)
- **Live Demo**: [sparq-electronics.vercel.app](https://sparq-electronics.vercel.app)

---

## License

MIT License - See [LICENSE](LICENSE)

---

<div align="center">

**Built with ❤️ by [BD Soft](https://github.com/demoprojectbdsoft)**

⚡ Sparq - Better products. A brighter you.

</div>