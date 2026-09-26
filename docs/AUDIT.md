# Queensy BnB — Technical & Product Audit

Audit of commit `73f9f71` (the last commit on `main` before the refactor).

## 1. What currently exists

| Area | Current state |
|---|---|
| Stack | Vite 6 + React 19 SPA, React Router 7, Tailwind 4 (configured with v3 syntax), Framer Motion, Firebase JS SDK 11 (Auth, Firestore, Storage), Recharts, date-fns 4 |
| Hosting | `firebase.json` → Firebase Hosting serving `dist/` as static files |
| Backend | None. The browser talks straight to Firestore/Storage. No Cloud Functions, no `firestore.rules`, no `storage.rules`, and no indexes in the repo |
| Data | Firestore collections: `Bookings`, `Properties`, `Reviews`, `Tickets`. Three properties are also hard-coded in `src/properties.js`, with prices duplicated in `BookingForm.jsx`, `CalendarView.jsx` and `FeedbackForm.jsx` |
| Pages | 19 page components: home, properties, booking, dashboard (×2), contact, FAQ, feedback, support, guest login, admin login/dashboard/listings/export/feedback/tickets/performance, calendar |
| Leftovers | `diani-bnb/`: an unused Create React App scaffold with its own `package.json` |

## 2. What is working

In practice, nothing. **The app does not build.** `vite build` fails with `Could not resolve entry module "index.html"`. The build errors below each break the app on their own:

- There's no `index.html` and no `public/` directory at the root.
- `src/main.jsx` imports `./styles/global.css`, but the file is at `/styles/global.css`.
- `App.jsx` imports `./pages/Feedback`, but the file is `FeedbackForm.jsx`.
- `Booking.jsx` and `Properties.jsx` import `../data/properties`, but the file is `src/properties.js`.
- `Home.jsx` imports `../assets/diani-hero.jpg`, which doesn't exist. No property images exist anywhere in the repo, although `/assets/chameleone1/1.jpg` and similar paths are referenced.
- `AdminExport.jsx` calls `new Parser(...)`, which is never imported (json2csv was swapped for papaparse halfway).
- `CalendarView.jsx` uses `import format from 'date-fns/format'`. date-fns v4 has no default export there.
- `postcss.config.js` and `tailwind.config.js` use Tailwind v3 CommonJS config with Tailwind v4, so no CSS is generated.

The parts worth keeping are the ideas behind the code: the three real listings (Chameleone 1, Chameleone 2, Wendy's Penthouse in Diani, with prices and amenities), the 12-hour booking hold, the four review dimensions (host, amenities, cleanliness, neighbourhood), CSV export of bookings, and support tickets.

## 3. What is broken (functional and security)

**Critical (security and data)**
1. **No authorization.** `AdminDashboard` treats *any* signed-in Firebase user as an admin. Any visitor can sign up through `/login` and then open `/admin`. Every other admin page (`/admin/listings`, `/admin/export`, `/admin/tickets`, `/admin/performance`, `/calendar`, `/dashboard`) has **no auth check at all**.
2. **Customer PII is readable by anyone.** `/dashboard` downloads every booking (names, emails, dates, amounts) for any anonymous visitor. `CustomerDashboard` also downloads all bookings and filters them in the browser. This only works because Firestore rules must be open (test mode). Anyone with the public web config can read, write or delete all data straight through the Firestore REST API.
3. Anonymous users can delete bookings (`CalendarView` calls `deleteDoc` with no auth) and listings (`AdminListings`).
4. `.env` is committed, and the Firebase config is also hard-coded in `firebaseConfig.js`. `.gitignore` is saved as UTF-16, so git can't read it and it ignores nothing.
5. Storage uploads use `properties/${file.name}`. Files with the same name overwrite each other, and there's no type or size validation.

**Booking**
6. There's no availability check, so double-booking is possible. Nothing stops two overlapping bookings.
7. The client calculates prices, so a user can write any `totalAmount`.
8. Bookings are linked to properties by display name (a string), and to customers by email (a string).
9. `BookingForm.jsx` shows "booking confirmed" through `alert()` and saves nothing.
10. The 12-hour "timer" is only a label. Nothing expires a booking or frees the dates.
11. `Booking.handleChange` reads stale state, so the total lags one keystroke behind.

**Other**
12. `/dashboard` is registered twice, so `CustomerDashboard` can never be reached.
13. The Navbar links to `/admin/bookings`, which doesn't exist. "View Details" on property cards is `href="#"`.
14. The feedback form lets anyone review any property without having stayed there, and the "recommendation" is picked from canned phrases.
15. The support form stores `email: 'unknown'` for anonymous users, so the business can't reply.
16. The Contact page has no content. The FAQ promises a refund policy, long-stay discounts and host chat that don't exist.
17. The Notification context is never mounted.

## 4. What is outdated

- The visual language mixes blue, lime, yellow and purple buttons, uses a wave SVG divider, emoji headings and heavy shadows. There's no design system.
- The SPA is client-rendered only, so property pages can't be indexed. There's no metadata, sitemap or structured data (`robots.txt` exists only in the unused CRA folder).
- There's no TypeScript, validation, error or loading states, or tests.
- Branding is inconsistent: the UI says "Diani BnB", the product is "Queensy BnB", and the Firebase project is `diani-bnb`.

## 5. Preserve

- The real listings and their content, prices (KES), amenities and bed configuration.
- All Firestore data: bookings, properties (with Storage image URLs), reviews and tickets. A migration script imports it without deleting anything.
- The 12-hour booking hold, now as a configurable setting (`booking.holdHours`) that the server enforces.
- The review dimensions (host, amenities, cleanliness, neighbourhood), CSV export, support tickets (now messaging and inquiries), and the performance dashboard (now admin analytics).
- Existing URLs (`/properties`, `/booking`, `/dashboard`, `/admin/*`) redirect to their new equivalents.

## 6. Refactor, remove and rebuild

| Action | Items |
|---|---|
| **Remove** | `diani-bnb/` CRA scaffold, `firebase.json`, the Firebase client SDK, `json2csv`, `react-calendar`, `react-icons`, the committed `.env`, `.vscode/launch.json` (points at the wrong port), the hard-coded property arrays |
| **Rebuild** | Every page. The components are too small and too coupled to Firestore to be worth adapting, and none of them compile. |
| **Refactor into services** | Pricing, availability, booking, auth, messaging, notifications, analytics and audit logging move into a typed server-side service layer |

## 7. Architectural changes and why

| Change | Why it's necessary | Impact and risk |
|---|---|---|
| **Vite SPA → Next.js (App Router, React Server Components)** | SEO is a core requirement. Property and destination pages must be server-rendered HTML, which a client-only SPA can't provide. Next.js also gives us a server for authoritative booking logic. | Full frontend rebuild. The same React skills apply. |
| **Firestore → PostgreSQL (via Prisma)** | Preventing double-booking needs a database-level guarantee. Postgres **exclusion constraints** on date ranges enforce it even under concurrent requests. The admin, analytics, prospect and audit features are relational, with aggregates, joins and filters. Postgres is portable (Supabase, Neon, RDS or self-hosted). | Data needs a one-off migration: `scripts/migrate-firestore.ts` is idempotent, defaults to a dry run, and keeps Firestore IDs in `legacyId` columns. Firestore stays untouched and read-only for rollback. |
| **Firebase Auth → first-party session auth** | Roles must be enforced on the server for every action. Sessions are HttpOnly cookies backed by the database, and passwords are hashed with Argon2id. This removes a whole class of client-trust bugs and the vendor lock-in. | Existing Firebase Auth users can't bring their password hashes across without Firebase's hash parameters. After migration, users reset their password by email; their accounts and bookings are linked by email. |
| **Realtime via Postgres `LISTEN/NOTIFY` + Server-Sent Events** | Real realtime (chat, typing, booking updates, live availability) without adding a vendor. It works across several app instances because Postgres fans out the events. | Needs a long-lived Node server (Docker, Render, Fly, Railway, VPS or Cloud Run). On serverless hosts, SSE reconnects automatically and the client catches up by fetching. |
| **Images: storage adapter (local disk or S3-compatible) + sharp** | Removes the Firebase Storage coupling. Uploads are validated, re-encoded to WebP at several sizes and given unique names. | S3 credentials are needed in production (Supabase Storage, Cloudflare R2 and AWS S3 all work). |

## 8. Database changes required

The current Firestore documents have no referential integrity. Here's how each collection maps to the new schema:

| Firestore | New table(s) | Notes |
|---|---|---|
| `Properties` + `src/properties.js` | `Property`, `PropertyImage`, `Amenity`, `PropertyAmenity`, `Room`, `Destination` | Matched by name to a slug. Images keep their original Firebase Storage URLs until they're re-uploaded. |
| `Bookings` | `Booking`, `BookingStatusEvent` | The property is resolved by name. Legacy bookings have no user, so they're linked to a `User` by email when one exists; the guest name and email are copied onto the booking. |
| `Reviews` | `Review` | Imported as **hidden, unverified**. Anyone could post them, so an admin decides whether to publish. |
| `Tickets` | `Inquiry` (+ `Prospect` when an email exists) | Status is mapped (Pending → New, In Progress → In progress, Resolved → Closed). |

The new tables required by the product are User, Session, AuthToken, MarketingPreference, ConsentRecord, AvailabilityBlock, Payment, Favorite, Conversation, Message, Offer, Announcement, Notification, NotificationDelivery, Prospect, ProspectNote, AnalyticsEvent, AuditLog, Setting and RateLimit.

## 9. Security findings to act on now (outside the code)

1. **Lock down Firestore and Storage rules immediately** (`allow read, write: if false;` after exporting data). The current production data is very likely world-readable and writable.
2. Restrict the Firebase web API key in the Google Cloud console, or delete the project once migration is verified.
3. Rotate anything that shares credentials with this Firebase project.
