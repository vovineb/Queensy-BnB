-- Booking integrity guards that Prisma's schema language cannot express.
--
-- 1. No two *active* bookings for the same property may overlap.
--    Stays are half-open ranges [check_in, check_out) so back-to-back stays
--    (one guest checks out the day the next checks in) are allowed.
--    Enforced by Postgres itself, so it holds under any concurrency.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "property_id" WITH =,
    daterange("check_in", "check_out", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED'));

-- 2. Basic sanity checks on stays and money.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_dates_valid" CHECK ("check_out" > "check_in"),
  ADD CONSTRAINT "bookings_nights_valid" CHECK ("nights" = ("check_out" - "check_in")),
  ADD CONSTRAINT "bookings_guests_valid" CHECK ("adults" >= 1 AND "children" >= 0 AND "infants" >= 0),
  ADD CONSTRAINT "bookings_amounts_valid" CHECK ("subtotal" >= 0 AND "discount_amount" >= 0 AND "cleaning_fee" >= 0 AND "total" >= 0);

ALTER TABLE "availability_blocks"
  ADD CONSTRAINT "availability_blocks_dates_valid" CHECK ("end_date" > "start_date");

ALTER TABLE "properties"
  ADD CONSTRAINT "properties_capacity_valid" CHECK ("max_guests" >= 1 AND "bedrooms" >= 0 AND "beds" >= 0 AND "bathrooms" >= 0),
  ADD CONSTRAINT "properties_price_valid" CHECK ("base_price" >= 0 AND "cleaning_fee" >= 0 AND "min_nights" >= 1);

ALTER TABLE "offers"
  ADD CONSTRAINT "offers_window_valid" CHECK ("ends_at" > "starts_at"),
  ADD CONSTRAINT "offers_value_valid" CHECK (
    ("discount_type" = 'PERCENT' AND "discount_value" BETWEEN 1 AND 100)
    OR ("discount_type" = 'FIXED' AND "discount_value" > 0)
  );

ALTER TABLE "reviews"
  ADD CONSTRAINT "reviews_ratings_valid" CHECK (
    "host_rating" BETWEEN 1 AND 5 AND "amenities_rating" BETWEEN 1 AND 5
    AND "cleanliness_rating" BETWEEN 1 AND 5 AND "neighborhood_rating" BETWEEN 1 AND 5
  );

-- Only one cover image per property.
CREATE UNIQUE INDEX "property_images_one_cover" ON "property_images" ("property_id") WHERE "is_cover";
