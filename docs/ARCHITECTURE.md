# Architecture

## Overview

Queensy BnB is a single Next.js application. It server-renders the public site (for SEO and fast first paint), hosts the customer account area and the admin dashboard, and exposes a small set of API routes. All business rules run on the server. The browser is never trusted for prices, availability or permissions.

```
Browser ──HTML/RSC──▶ Next.js (App Router)
   │                     ├─ Server Components  → services → Prisma → PostgreSQL
   │                     ├─ Server Actions (mutations, CSRF-protected by Next's origin check)
   │                     ├─ /api/quote, /api/availability/:id, /api/events, /api/cron/*
   └──EventSource───────▶└─ /api/realtime (SSE) ◀── LISTEN qb_realtime ◀── pg_notify(...) from any instance
```

Code layers:

- `src/lib`: pure logic shared by server and client, such as dates, money formatting, pricing, validation schemas and SEO helpers.
- `src/server/services`: the domain layer. Each service validates its inputs, enforces authorisation and owns its transactions.
- `src/server/actions`: thin Server Actions. Each one parses `FormData` with zod, calls a service, and maps `AppError` to a form result.
- `src/app`: routes only. Pages call services directly for reads.

## Roles

| Role | Can |
|---|---|
| Guest (anonymous) | Browse, search, view properties, check availability and prices, send contact inquiries, subscribe to the newsletter |
| Customer | Everything guests can, plus book, cancel their own bookings before check-in, message the team, save stays, review completed stays, manage their profile and privacy, and export their data |
| Admin | Everything, through `/admin`. Every admin operation checks `requireAdmin()` on the server and writes an audit log entry. |

Enforcement happens in three layers:

1. `proxy.ts` redirects requests without a session cookie away from private pages. This is a convenience, not a security boundary.
2. Every page calls `requireUserPage` or `requireAdminPage`.
3. Every action or service checks ownership or role (`requireUser`, `requireAdmin`, and ownership checks in services).

The integration tests call admin actions as an anonymous user and as a customer, and assert that nothing changes.

## Data model (PostgreSQL)

See `prisma/schema.prisma`, which is fully commented. The main groups are:

- **Identity:** `users`, `sessions` (stores sha256 of the token), `auth_tokens` (password reset and email verification, hashed, single-use).
- **Privacy:** `marketing_preferences` holds current choices. `consent_records` is an append-only history of every consent given or withdrawn, with source and policy version.
- **Catalogue:** `destinations`, `properties` (money stored as integer minor units plus an ISO currency code), `property_images`, `amenities`, `property_amenities`, `rooms`, `availability_blocks`.
- **Bookings:** `bookings` (price snapshot and guest-contact snapshot), `booking_status_events` (full status history), `payments` (ledger that doesn't depend on a payment provider).
- **Engagement:** `reviews` (linked to a booking, verified), `favorites`, `conversations`, `messages`, `notifications`, `notification_deliveries`.
- **Marketing and CRM:** `offers`, `offer_properties`, `announcements`, `inquiries`, `prospects`, `prospect_notes`.
- **Operations:** `analytics_events`, `audit_logs`, `settings`, `rate_limits`.

Integrity rules that Prisma can't express are added as raw SQL in migrations (`prisma/migrations/*_booking_integrity`):

- `EXCLUDE USING gist (property_id WITH =, daterange(check_in, check_out, '[)') WITH &&) WHERE status IN (active statuses)`. Two active bookings for the same property can never overlap, however many requests arrive at once. Back-to-back stays are allowed.
- CHECK constraints on dates, nights, guests, money, ratings and offer values, plus at most one cover image per property.

## Booking

States: `PENDING → AWAITING_PAYMENT → PAID/CONFIRMED → COMPLETED`, plus `CANCELLED`, `EXPIRED` and `REFUNDED`. The allowed transitions are listed in `BOOKING_TRANSITIONS` (`src/server/services/bookings.ts`).

1. The property page loads `/api/availability/:id` and subscribes to `availability:<id>` over SSE. When anyone books or releases dates, every open calendar refreshes.
2. The quote (`/api/quote`) is computed on the server: nightly rate × nights, minus the best applicable offer, plus the cleaning fee.
3. `createBooking` runs in a single transaction:
   1. `SELECT … FOR UPDATE` on the property row, which serialises bookings per property.
   2. Expire any lapsed holds.
   3. Validate the stay rules (past dates, booking horizon, min/max nights, capacity).
   4. Check bookings and blocks for conflicts.
   5. Recompute the price. If it differs from what the guest saw, reject with `PRICE_CHANGED`.
   6. Insert the booking with a hold (`expires_at`, 12 hours by default and configurable in Settings).

   The exclusion constraint is the final backstop.
4. After commit: realtime events, in-app notifications (plus email when SMTP is configured) for the guest and the admins, and an audit entry.
5. Admins confirm the booking, request payment, record payments (full payment moves it to `PAID`), extend the hold, cancel or refund it. Customers can cancel their own booking before check-in.
6. Maintenance runs from `/api/cron/maintenance` and also opportunistically. It expires lapsed holds, marks finished stays `COMPLETED`, and purges old sessions, tokens, rate-limit rows and analytics events.

Concurrency is tested: 10 simultaneous requests for the same dates produce exactly one booking. That test caught a connection-pool deadlock during development, which is now fixed.

## Payments (prepared, not integrated)

`src/server/payments/index.ts` defines a `PaymentProvider` interface (initiate, handle webhook) and documents the steps to add M-Pesa (Daraja), Stripe, Pesapal and so on. Today, admins record payments received offline through the `manual` provider, which writes to the `payments` ledger. The booking state machine, holds and notifications already work for online payments. No fake payment processing exists.

## Realtime

`src/server/realtime.ts`: any instance publishes with `SELECT pg_notify('qb_realtime', payload)`. Each instance keeps one `LISTEN` connection and fans events out to its SSE clients. Payloads contain IDs only, and clients refetch what they're allowed to see.

`/api/realtime` grants only the channels the caller is authorised for:

| Channel | Who can subscribe |
|---|---|
| `me` → `user:<id>` | The signed-in user |
| `admin` | Admins |
| `conversation:<id>` | The customer in the conversation, or an admin |
| `availability:<id>` | Anyone (public) |

Features built on it:

- Chat messages, typing indicators and read receipts ("Delivered" / "Seen").
- Unread badges.
- Live booking status on the guest's trip page.
- The admin feed: new bookings, messages and inquiries show up with toasts.
- Live availability calendars.

`EventSource` reconnects automatically, and clients refetch after a reconnect.

## Notifications

`notifyUser()` stores an in-app notification, publishes it over realtime, then sends it through channel adapters. Email via SMTP is implemented; SMS, push and WhatsApp plug in as further adapters. Transactional types always send. Marketing emails (`sendMarketingEmail`) go **only** to users with `marketing_preferences.email = true`. Every delivery attempt is recorded in `notification_deliveries`.

## Analytics

The event types are `page_view`, `property_view`, `search`, `filter_used`, `gallery_opened`, `booking_started` and `contact_started`, plus these server-confirmed events: `booking_completed`, `booking_cancelled`, `favorite_added`/`removed`, `message_sent`, `signup` and `login`.

Events are tied to a random first-party visitor cookie and optionally the user ID. They store no IP address or user agent. Events are skipped when the browser sends Do-Not-Track or Global Privacy Control. Raw events are kept for 13 months. To forward events to GA4, PostHog or Plausible, add the forwarding in `track()`.

## SEO

- Public pages are server-rendered with metadata and canonical URLs from `pageMetadata()`, plus Open Graph and Twitter cards.
- Clean URLs: `/properties/[slug]` and `/destinations/[slug]`.
- JSON-LD:
  - `Organization` and `WebSite` (with `SearchAction`) on the homepage.
  - `VacationRental` and `BreadcrumbList` on property pages. `AggregateRating` is included only when real, published reviews exist.
  - `TouristDestination` and `ItemList` on destination pages.
  - `FAQPage` and `NewsArticle` on the FAQ and announcement pages.
- `sitemap.xml` is generated from the database (including image URLs). `robots.txt` disallows private areas.
- Filtered search pages are `noindex`. Legacy URLs 301/308-redirect to their new equivalents.

## Security

| Area | Measures |
|---|---|
| Passwords | Argon2id (OWASP parameters), 10-character minimum, constant-time responses for unknown emails |
| Sessions | Random 256-bit tokens in HttpOnly, SameSite=Lax, Secure cookies; only the sha256 is stored; sliding 30-day expiry; revoked on password reset or change, role change and deactivation |
| CSRF | Server Actions are origin-checked by Next. API POST routes check `Origin`/`Sec-Fetch-Site`. |
| Validation | zod on every input, and Prisma parameterised queries (raw SQL uses tagged templates) |
| Rate limits | Stored in Postgres, keyed by an HMAC of the identifier: sign-up, login (per IP and per email), password reset, inquiries, newsletter |
| Uploads | Admin-only; decoded with sharp (declared MIME type ignored), 15 MB limit, pixel limit, re-encoded to WebP, EXIF/GPS stripped, random names, safe storage keys |
| Headers | CSP, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS (production), no `X-Powered-By` |
| Other | Open-redirect protection on `next`, CSV formula-injection escaping, a honeypot on public forms, XSS-safe JSON-LD, private addresses shown only after confirmation |

## Internationalisation

- Money is stored as integer minor units with a per-property currency, and formatted with `Intl.NumberFormat` (`formatMoney`).
- Dates are pure calendar dates, formatted with `Intl.DateTimeFormat`. "Today" is computed in `DEFAULT_TIMEZONE` (Africa/Nairobi).
- Phone numbers use libphonenumber: any country, stored as E.164.

UI strings are English and live in components. Adding a message catalogue (for example `next-intl`) is the next step if Swahili or other languages are needed.

## Design system

- Tokens are defined in `src/app/globals.css` (`@theme`):
  - Colours: warm "ink" neutrals, "lagoon" teal for brand and trust, "sunset" terracotta for conversion actions only, gold for ratings, and a chart colour validated for chroma and contrast.
  - A fluid type scale with Plus Jakarta Sans for display and Inter for body (both self-hosted), plus radii and shadows.
- Components live in `src/components/ui`: Button, Field/Input/Select/Checkbox, Modal/Drawer/ConfirmDialog (Radix, focus-trapped), Badge/Alert/Card/EmptyState/Skeleton, ResponsiveImage, Rating, Price, Pagination and Reveal.
- Motion is used sparingly (springs, opacity and transform) and respects `prefers-reduced-motion` through `MotionConfig` and CSS.
