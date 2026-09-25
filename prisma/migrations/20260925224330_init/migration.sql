-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('PASSWORD_RESET', 'EMAIL_VERIFICATION');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('PRIVACY_NOTICE', 'TERMS', 'MARKETING_EMAIL', 'MARKETING_SMS', 'MARKETING_WHATSAPP');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('APARTMENT', 'STUDIO', 'PENTHOUSE', 'VILLA', 'HOUSE', 'COTTAGE', 'SUITE', 'ROOM');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CancellationPolicy" AS ENUM ('FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'AWAITING_PAYMENT', 'PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "AnnouncementKind" AS ENUM ('PRICE_UPDATE', 'NEW_PROPERTY', 'SPECIAL_OFFER', 'SEASONAL', 'SERVICE');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "ProspectSource" AS ENUM ('INQUIRY', 'ABANDONED_BOOKING', 'NEWSLETTER', 'SIGNUP', 'MANUAL');

-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "phone_country" CHAR(2),
    "password_hash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT,
    "email_verified_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketing_preferences" (
    "user_id" TEXT NOT NULL,
    "email" BOOLEAN NOT NULL DEFAULT false,
    "sms" BOOLEAN NOT NULL DEFAULT false,
    "whatsapp" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_preferences_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "consent_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "email" TEXT,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "policy_version" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT,
    "country" CHAR(2) NOT NULL DEFAULT 'KE',
    "summary" TEXT,
    "description" TEXT,
    "image_url" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legacy_id" TEXT,
    "name" TEXT NOT NULL,
    "type" "PropertyType" NOT NULL DEFAULT 'APARTMENT',
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "destination_id" TEXT,
    "neighborhood" TEXT,
    "address_line" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "max_guests" INTEGER NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "beds" INTEGER NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL DEFAULT 1,
    "currency" CHAR(3) NOT NULL DEFAULT 'KES',
    "base_price" INTEGER NOT NULL,
    "cleaning_fee" INTEGER NOT NULL DEFAULT 0,
    "min_nights" INTEGER NOT NULL DEFAULT 1,
    "max_nights" INTEGER,
    "check_in_time" TEXT NOT NULL DEFAULT '14:00',
    "check_out_time" TEXT NOT NULL DEFAULT '10:00',
    "house_rules" TEXT,
    "cancellation_policy" "CancellationPolicy" NOT NULL DEFAULT 'MODERATE',
    "cancellation_notes" TEXT,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_images" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storage_key" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT NOT NULL DEFAULT '',
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "property_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL DEFAULT 'General',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "property_amenities" (
    "property_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,

    CONSTRAINT "property_amenities_pkey" PRIMARY KEY ("property_id","amenity_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beds" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_blocks" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reason" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "legacy_id" TEXT,
    "property_id" TEXT NOT NULL,
    "user_id" TEXT,
    "check_in" DATE NOT NULL,
    "check_out" DATE NOT NULL,
    "nights" INTEGER NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "currency" CHAR(3) NOT NULL,
    "nightly_rate" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "cleaning_fee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "offer_id" TEXT,
    "guest_name" TEXT NOT NULL,
    "guest_email" TEXT NOT NULL,
    "guest_phone" TEXT,
    "special_requests" TEXT,
    "expires_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "booking_status_events" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "from_status" "BookingStatus",
    "to_status" "BookingStatus" NOT NULL,
    "actor_id" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT,
    "method" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "recorded_by_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "legacy_id" TEXT,
    "property_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "user_id" TEXT,
    "author_name" TEXT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "host_rating" INTEGER NOT NULL,
    "amenities_rating" INTEGER NOT NULL,
    "cleanliness_rating" INTEGER NOT NULL,
    "neighborhood_rating" INTEGER NOT NULL,
    "comment" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "user_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("user_id","property_id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "property_id" TEXT,
    "booking_id" TEXT,
    "subject" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "last_message_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_last_read_at" TIMESTAMP(3),
    "staff_last_read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "from_staff" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "promo_copy" TEXT,
    "image_url" TEXT,
    "discount_type" "DiscountType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "min_nights" INTEGER NOT NULL DEFAULT 1,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "applies_to_all" BOOLEAN NOT NULL DEFAULT true,
    "show_banner" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_properties" (
    "offer_id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,

    CONSTRAINT "offer_properties_pkey" PRIMARY KEY ("offer_id","property_id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "AnnouncementKind" NOT NULL DEFAULT 'SERVICE',
    "image_url" TEXT,
    "cta_label" TEXT,
    "cta_url" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "publish_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" TEXT NOT NULL,
    "legacy_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "property_id" TEXT,
    "attachment_url" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "prospect_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospects" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "source" "ProspectSource" NOT NULL,
    "status" "ProspectStatus" NOT NULL DEFAULT 'NEW',
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT,
    "assigned_to_id" TEXT,
    "last_contacted_at" TIMESTAMP(3),
    "next_follow_up_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prospects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prospect_notes" (
    "id" TEXT NOT NULL,
    "prospect_id" TEXT NOT NULL,
    "author_id" TEXT,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prospect_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "user_id" TEXT,
    "property_id" TEXT,
    "path" TEXT,
    "props" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_token_hash_key" ON "auth_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_tokens_user_id_purpose_idx" ON "auth_tokens"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "consent_records_user_id_type_created_at_idx" ON "consent_records"("user_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "consent_records_email_idx" ON "consent_records"("email");

-- CreateIndex
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "properties_slug_key" ON "properties"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "properties_legacy_id_key" ON "properties"("legacy_id");

-- CreateIndex
CREATE INDEX "properties_status_featured_idx" ON "properties"("status", "featured");

-- CreateIndex
CREATE INDEX "properties_destination_id_status_idx" ON "properties"("destination_id", "status");

-- CreateIndex
CREATE INDEX "properties_base_price_idx" ON "properties"("base_price");

-- CreateIndex
CREATE INDEX "property_images_property_id_sort_order_idx" ON "property_images"("property_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_slug_key" ON "amenities"("slug");

-- CreateIndex
CREATE INDEX "property_amenities_amenity_id_idx" ON "property_amenities"("amenity_id");

-- CreateIndex
CREATE INDEX "rooms_property_id_idx" ON "rooms"("property_id");

-- CreateIndex
CREATE INDEX "availability_blocks_property_id_start_date_idx" ON "availability_blocks"("property_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_reference_key" ON "bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_legacy_id_key" ON "bookings"("legacy_id");

-- CreateIndex
CREATE INDEX "bookings_property_id_check_in_check_out_idx" ON "bookings"("property_id", "check_in", "check_out");

-- CreateIndex
CREATE INDEX "bookings_user_id_created_at_idx" ON "bookings"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "bookings_status_expires_at_idx" ON "bookings"("status", "expires_at");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at");

-- CreateIndex
CREATE INDEX "booking_status_events_booking_id_created_at_idx" ON "booking_status_events"("booking_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_provider_ref_key" ON "payments"("provider", "provider_ref");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_legacy_id_key" ON "reviews"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_booking_id_key" ON "reviews"("booking_id");

-- CreateIndex
CREATE INDEX "reviews_property_id_status_created_at_idx" ON "reviews"("property_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "favorites_property_id_idx" ON "favorites"("property_id");

-- CreateIndex
CREATE INDEX "conversations_customer_id_last_message_at_idx" ON "conversations"("customer_id", "last_message_at");

-- CreateIndex
CREATE INDEX "conversations_status_last_message_at_idx" ON "conversations"("status", "last_message_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "offers_active_starts_at_ends_at_idx" ON "offers"("active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "offer_properties_property_id_idx" ON "offer_properties"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "announcements_slug_key" ON "announcements"("slug");

-- CreateIndex
CREATE INDEX "announcements_status_publish_at_idx" ON "announcements"("status", "publish_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE INDEX "notification_deliveries_notification_id_idx" ON "notification_deliveries"("notification_id");

-- CreateIndex
CREATE UNIQUE INDEX "inquiries_legacy_id_key" ON "inquiries"("legacy_id");

-- CreateIndex
CREATE INDEX "inquiries_status_created_at_idx" ON "inquiries"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "prospects_email_key" ON "prospects"("email");

-- CreateIndex
CREATE INDEX "prospects_status_created_at_idx" ON "prospects"("status", "created_at");

-- CreateIndex
CREATE INDEX "prospect_notes_prospect_id_created_at_idx" ON "prospect_notes"("prospect_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_name_created_at_idx" ON "analytics_events"("name", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_property_id_name_idx" ON "analytics_events"("property_id", "name");

-- CreateIndex
CREATE INDEX "analytics_events_visitor_id_created_at_idx" ON "analytics_events"("visitor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_preferences" ADD CONSTRAINT "marketing_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_images" ADD CONSTRAINT "property_images_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "property_amenities" ADD CONSTRAINT "property_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_events" ADD CONSTRAINT "booking_status_events_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking_status_events" ADD CONSTRAINT "booking_status_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_properties" ADD CONSTRAINT "offer_properties_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_properties" ADD CONSTRAINT "offer_properties_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospects" ADD CONSTRAINT "prospects_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_notes" ADD CONSTRAINT "prospect_notes_prospect_id_fkey" FOREIGN KEY ("prospect_id") REFERENCES "prospects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prospect_notes" ADD CONSTRAINT "prospect_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
