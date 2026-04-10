---
name: Project overview
description: Dyla Archery — custom arrow builder site, two brothers, Cloudflare stack
type: project
---

Dyla Archery: e-commerce site for custom-built arrows. Two brothers run it.

**Stack:** React 19, React Router 7, Tailwind CSS, Hono.js, Cloudflare Pages Functions, Cloudflare D1 (SQLite), Cloudflare R2 (images), Cloudflare Access (admin auth), Stripe Checkout, Resend (email).

**Key flows:**
- Builder → draft order → Stripe Checkout → `/order/success`
- Stripe webhook at `/api/webhooks/stripe` flips order `draft → paid` + sends confirmation email
- Admin at `/admin` (Cloudflare Access protected): Catalog / Orders / Customers / Marketing tabs

**Admin sections (as of 2026-04-07):**
- Catalog: product CRUD for shafts, vanes, nocks, wraps, inserts, points
- Orders: list + detail with status stepper, Mark as Paid (cash/Venmo), shipping input, message customer via email
- Customers: list + order history per customer
- Marketing: abandoned cart leads, send coupon emails

**Marketing/coupon flow:**
- Builder silently POSTs lead to `/api/marketing/lead` when user enters email
- Admin can send `$N off` coupon email from Marketing tab → generates unique `SAVE10-XXXXXXXX` code
- Coupon link in email goes to `/builder?coupon=CODE`; builder pre-fills + validates via `/api/builder/coupon`
- Coupon applied at draft creation, discount reflected in Stripe amount

**DB tables:** shafts, vanes, nocks, wraps, inserts, points, product_images, customers, orders, arrow_builds, order_status_history, order_messages, marketing_leads, coupons, contact_messages

**Order statuses:** draft → paid → processing → built → shipped → delivered (or cancelled)

**Required env vars:** STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY (all Cloudflare secrets)

**Email FROM address:** `orders@dylaarchery.com` — must match verified Resend domain.

**To run migration:** `wrangler d1 execute dylaarchery --file=scripts/migrate-orders-marketing.sql --remote`
**Register Stripe webhook:** `https://dylaarchery.com/api/webhooks/stripe` → event: `checkout.session.completed`
