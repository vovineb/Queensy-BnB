# Deployment, environments and data migration

## Environments

Use a separate database for each environment. Copy `.env.example` and fill it in.

| Variable | Dev | Staging / Prod | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | public HTTPS origin | Used for canonical URLs, the sitemap and links in emails. Build-time. |
| `DATABASE_URL` | local Postgres | managed Postgres (pooled is OK) | |
| `DIRECT_DATABASE_URL` | same | **direct** (non-pooled) URL | Needed for migrations and realtime `LISTEN`. PgBouncer transaction pooling doesn't support `LISTEN`. |
| `APP_SECRET` | any 32+ chars | `openssl rand -base64 48` | HMAC key for rate-limit identifiers |
| `CRON_SECRET` | any | random | Bearer token for `/api/cron/maintenance` |
| `SMTP_URL`, `EMAIL_FROM` | optional | **required** | Without SMTP, emails are logged (dev) or skipped (prod), and the admin shows a warning. |
| `STORAGE_DRIVER` | `local` | `s3` | Local disk is only for a single persistent server. |
| `S3_*` | — | bucket credentials | Any S3-compatible store: Supabase Storage, Cloudflare R2, AWS S3 |
| `DEFAULT_CURRENCY`, `DEFAULT_TIMEZONE` | `KES`, `Africa/Nairobi` | same | |

Never commit `.env` files. The previous repository committed its Firebase `.env`. See the security notes in `docs/AUDIT.md`.

## Hosting

The app needs a Node server that allows long-lived responses, because `/api/realtime` uses Server-Sent Events.

- **Recommended:** a container on Fly.io, Render, Railway, Google Cloud Run (enable a long request timeout), or a VPS. Pair it with managed Postgres (Supabase, Neon, RDS, and so on). Use the included `Dockerfile`:

  ```bash
  docker build --target migrate -t queensy-migrate . && docker run --env-file .env.production queensy-migrate
  docker build -t queensy . && docker run --env-file .env.production -p 3000:3000 queensy
  ```

- **Vercel (free Hobby plan works):**
  1. Import the GitHub repo. The framework and build settings are detected automatically.
  2. Under **Storage**, create a **Blob** store and connect it to the project. This sets `BLOB_READ_WRITE_TOKEN`, which the app uses for photo uploads automatically.
  3. Add `DATABASE_URL` (pooled), `DIRECT_DATABASE_URL`, `APP_SECRET` and `CRON_SECRET` for Production and Preview. `NEXT_PUBLIC_SITE_URL` is optional; the Vercel domain is used when it's missing.
  4. `vercel.json` pins functions to `fra1` (Frankfurt, close to Kenya and to a Neon `eu-central-1` database) and schedules the maintenance job daily.

  Realtime streams close just before the function time limit, and browsers reconnect automatically.

Schedule the maintenance job every 5–15 minutes (host cron, GitHub Actions, or Cloud Scheduler):

```bash
curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron/maintenance
```

Holds also expire opportunistically when calendars are viewed, but the cron job keeps admin data tidy.

## Release checklist

1. `npm ci && npm run lint && npm run typecheck && npm test` (CI does this, plus the Playwright suite).
2. Apply migrations: `npm run db:migrate`. This is non-destructive and only applies pending migrations.
3. Deploy the new build.
4. First deploy only:
   1. Run `npm run db:seed` with `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, then remove those variables.
   2. Sign in to `/admin` and check the three seeded listings. Their guest capacity and bathroom counts weren't recorded by the old site and are conservative defaults.
   3. Upload photos and fill in Settings (contact details, WhatsApp, hero image).

## Migrating data from the legacy Firebase app

The old app stored data in Firestore collections `Properties`, `Bookings`, `Reviews` and `Tickets`. `scripts/migrate-firestore.ts` imports them.

1. **Freeze the old app first.** Firestore is currently world-writable, so lock its security rules to read-only for admins.
2. **Dry run.** Create a Firebase service account with read-only access, then:

   ```bash
   GOOGLE_APPLICATION_CREDENTIALS=./sa.json npm run migrate:firestore
   ```

   The report lists what would be imported and any warnings: unknown properties, invalid dates and overlapping bookings. Alternatively, export to JSON and use `--source json --file export.json`.
3. **Apply.** Re-run with `--apply`. Everything is written in one transaction, and each row keeps its Firestore document ID in `legacy_id`. Re-running is idempotent, because already-imported IDs are skipped.
4. **Verify.** In the admin, check:
   - **Bookings** (search for "legacy"):
     - Future stays are imported as *Awaiting confirmation* with a 7-day hold, so you can confirm or cancel them with the guest.
     - Past stays are *Expired*, because the old app never recorded payment.
     - Stays that overlapped an earlier booking are *Cancelled*, with a note saying which booking they clashed with.
   - **Reviews:** imported as *Hidden and unverified*, because anyone could post on the old site. Publish the ones you trust.
   - **Inquiries:** old support tickets.
5. Legacy bookings are linked to a customer account only after that customer proves they own the email. That happens when they verify the email or complete a password reset.

**Mapping from old to new:**

| Firestore field | New field |
|---|---|
| `Bookings.property` (name) | `bookings.property_id` |
| `name` / `email` | `guest_name` / `guest_email` |
| `checkIn` / `checkOut` | date columns |
| `totalAmount` (KES) | `total` (minor units) |
| `createdAt` | `created_at` |
| `Properties.price`, `beds`, `amenities`, `images` | `base_price`, `bedrooms`/`beds`, `property_amenities`, `property_images` (Storage URLs kept) |
| `Reviews.*Rating` | the four rating columns; `recommendation` → `comment` |
| `Tickets.issueType`, `description`, `status`, `imageURL` | `topic`, `message`, `status`, `attachment_url` |

**Rollback:**

- The import never modifies Firestore, so the old system stays intact.
- To undo an import, delete the rows it created: `DELETE … WHERE legacy_id IS NOT NULL` on `reviews`, `inquiries`, `booking_status_events` (through the bookings), `bookings` and `properties`, in that order. Take a database snapshot first.
- Schema migrations are additive. To roll back a release, redeploy the previous build; the new tables and columns are ignored by older code.

**Firebase Auth users:** accounts and password hashes are not migrated (the import never creates users). Past guests sign up with the same email; once they confirm it, their imported bookings appear in their account.
