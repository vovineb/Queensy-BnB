# Queensy BnB

Accommodation booking platform for Queensy BnB (Kenya), serving local and international guests.

- **Guests** can browse, search and check live availability and prices without an account.
- **Customers** book stays, manage and cancel trips, message the team in real time, save favourites, review completed stays and control their privacy and marketing preferences.
- **Admins** manage bookings, calendar, properties and photos, availability, destinations, offers, announcements, reviews, users, inquiries and prospects. They also get engagement analytics, site settings and an audit log.

| | |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components, Server Actions), React 19, TypeScript |
| Data | PostgreSQL 16 via Prisma 7. Booking overlaps are prevented by a database `EXCLUDE` constraint. |
| Realtime | Postgres `LISTEN/NOTIFY` fanned out over Server-Sent Events |
| Auth | First-party sessions: Argon2id password hashes, HttpOnly cookies, sessions stored in the database, server-side role checks |
| UI | Tailwind CSS 4 design tokens, Radix primitives (dialogs, popovers, menus), Framer Motion, react-day-picker, Recharts |
| Media | Sharp (validates, strips EXIF, WebP renditions); storage on local disk or any S3-compatible bucket |
| Tests | Vitest (unit + integration against Postgres) and Playwright (end-to-end, responsive, SEO, security) |

Documentation:

- [`docs/AUDIT.md`](docs/AUDIT.md): audit of the legacy app
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): how the system works
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md): environments, deployment, data migration and rollback

## Getting started

Requirements: Node 20.9+ and PostgreSQL 14+ with the `btree_gist` extension available (included with standard Postgres builds).

```bash
cp .env.example .env            # then set DATABASE_URL, APP_SECRET, ...
npm install                     # also generates the Prisma client
npm run db:migrate              # apply migrations
SEED_ADMIN_EMAIL=you@example.com SEED_ADMIN_PASSWORD='a-long-password' npm run db:seed
npm run dev                     # http://localhost:3000
```

The seed is safe to run in production. It adds only reference data (amenities, the Diani destination) and the real legacy listings. It never creates fake bookings, reviews or users. To create an admin later, run `npm run admin:create -- --email you@example.com`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build or serve the app |
| `npm run lint` / `typecheck` | ESLint and TypeScript checks |
| `npm test` | Unit and integration tests (needs a Postgres database whose name contains `test`; see `vitest.config.ts`) |
| `npm run test:e2e` | Playwright end-to-end tests (see `playwright.config.ts` for the database it expects) |
| `npm run db:migrate` | `prisma migrate deploy` (non-destructive) |
| `npm run migrate:firestore` | Import legacy Firestore data (dry run by default; see the deployment docs) |
| `npm run admin:create` | Create or promote an admin account |

## Project layout

```
prisma/            schema, migrations (incl. raw-SQL integrity constraints), seed
scripts/           CLI tools: Firestore import, admin bootstrap
src/app/           routes: (site) public + account, (auth), admin, api, sitemap/robots
src/components/    design system (ui/), site, property, booking, messaging, account, admin
src/lib/           shared, framework-free logic: dates, money, pricing, validation, SEO
src/server/        server-only code: db, auth, services (bookings, catalog, messaging, …), actions, realtime
tests/             unit, integration (Postgres) and e2e (Playwright)
```
