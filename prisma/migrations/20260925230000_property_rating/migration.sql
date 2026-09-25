-- Denormalised review aggregates for sorting/filtering listings by rating.
ALTER TABLE "properties" ADD COLUMN "rating_average" DECIMAL(3,2),
ADD COLUMN "review_count" INTEGER NOT NULL DEFAULT 0;
