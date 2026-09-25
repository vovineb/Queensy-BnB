// Imports legacy Firestore data (Properties, Bookings, Reviews, Tickets) into Postgres.
//
//   npm run migrate:firestore -- --source firestore            # dry run (default)
//   npm run migrate:firestore -- --source firestore --apply    # write
//   npm run migrate:firestore -- --source json --file export.json [--apply]
//
// Firestore source needs GOOGLE_APPLICATION_CREDENTIALS pointing to a service
// account JSON for the legacy project (read-only access is enough).
// JSON source: { "Properties": [{id, ...}], "Bookings": [...], "Reviews": [...], "Tickets": [...] }
//
// Guarantees:
// - Read-only against Firestore. Nothing is deleted anywhere.
// - Idempotent: rows are keyed by `legacyId`; re-running skips imported docs.
// - Legacy bookings never create user accounts. They are linked to a user only
//   after that user proves ownership of the email (verification / reset).
// - Overlapping legacy bookings cannot violate the new no-overlap constraint:
//   the later one is imported as CANCELLED with an explanatory note and listed
//   in the report for manual follow-up.
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { prisma } from "./db";
import { transformLegacy, type LegacyData } from "./migrate-firestore-transform";

async function loadFromFirestore(): Promise<LegacyData> {
  const { initializeApp, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  initializeApp({ credential: applicationDefault(), projectId: process.env.FIREBASE_PROJECT_ID ?? "diani-bnb" });
  const fs = getFirestore();
  const read = async (name: string) =>
    (await fs.collection(name).get()).docs.map((d) => {
      const data = d.data();
      // Convert Firestore Timestamps to ISO strings.
      for (const [k, v] of Object.entries(data)) {
        if (v && typeof v === "object" && "toDate" in v && typeof v.toDate === "function") data[k] = v.toDate().toISOString();
      }
      return { id: d.id, ...data };
    });
  const [Properties, Bookings, Reviews, Tickets] = await Promise.all(["Properties", "Bookings", "Reviews", "Tickets"].map(read));
  return { Properties, Bookings, Reviews, Tickets };
}

async function main() {
  const { values } = parseArgs({
    options: { source: { type: "string", default: "firestore" }, file: { type: "string" }, apply: { type: "boolean", default: false } },
  });
  const data: LegacyData =
    values.source === "json"
      ? JSON.parse(await readFile(values.file ?? "firestore-export.json", "utf8"))
      : await loadFromFirestore();

  const properties = await prisma.property.findMany({ select: { id: true, name: true, slug: true, legacyId: true, currency: true } });
  const destination = await prisma.destination.findUnique({ where: { slug: "diani" } });
  const amenities = await prisma.amenity.findMany({ select: { id: true, slug: true, name: true } });
  const alreadyImported = {
    properties: new Set(properties.map((p) => p.legacyId).filter(Boolean) as string[]),
    bookings: new Set((await prisma.booking.findMany({ where: { legacyId: { not: null } }, select: { legacyId: true } })).map((b) => b.legacyId!)),
    reviews: new Set((await prisma.review.findMany({ where: { legacyId: { not: null } }, select: { legacyId: true } })).map((r) => r.legacyId!)),
    inquiries: new Set((await prisma.inquiry.findMany({ where: { legacyId: { not: null } }, select: { legacyId: true } })).map((r) => r.legacyId!)),
  };
  const existingActive = await prisma.booking.findMany({
    where: { status: { in: ["PENDING", "AWAITING_PAYMENT", "PAID", "CONFIRMED", "COMPLETED"] } },
    select: { propertyId: true, checkIn: true, checkOut: true, reference: true },
  });

  const plan = transformLegacy(data, { properties, amenities, destinationId: destination?.id ?? null, alreadyImported, existingActive, now: new Date() });

  console.log("\n=== Firestore → Postgres migration plan ===");
  console.log(`Properties: ${plan.properties.length} new`);
  console.log(`Bookings:   ${plan.bookings.length} (${plan.bookings.filter((b) => b.status === "CANCELLED").length} imported as cancelled due to overlaps)`);
  console.log(`Reviews:    ${plan.reviews.length} (imported HIDDEN — publish from the admin after checking)`);
  console.log(`Inquiries:  ${plan.inquiries.length}`);
  if (plan.warnings.length) {
    console.log(`\nWarnings (${plan.warnings.length}):`);
    for (const w of plan.warnings) console.log(`  - ${w}`);
  }
  if (!values.apply) {
    console.log("\nDry run only. Re-run with --apply to write these records.");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      for (const p of plan.properties) {
        const { amenityIds, images, ...data } = p;
        const created = await tx.property.create({ data: { ...data, amenities: { create: amenityIds.map((amenityId) => ({ amenityId })) } } });
        await tx.propertyImage.createMany({ data: images.map((img) => ({ ...img, propertyId: created.id })) });
        plan.propertyIdByLegacyName.set(p.name.toLowerCase(), created.id);
      }
      for (const b of plan.bookings) {
        const propertyId = b.propertyId ?? plan.propertyIdByLegacyName.get(b.propertyName.toLowerCase());
        if (!propertyId) continue;
        const { propertyName: _n, note, ...data } = b;
        const created = await tx.booking.create({ data: { ...data, propertyId } });
        await tx.bookingStatusEvent.create({ data: { bookingId: created.id, toStatus: created.status, note } });
      }
      for (const r of plan.reviews) {
        const propertyId = r.propertyId ?? plan.propertyIdByLegacyName.get(r.propertyName.toLowerCase());
        if (!propertyId) continue;
        const { propertyName: _n, ...data } = r;
        await tx.review.create({ data: { ...data, propertyId } });
      }
      for (const i of plan.inquiries) await tx.inquiry.create({ data: i });
      await tx.auditLog.create({
        data: {
          action: "migration.firestore",
          entityType: "system",
          metadata: { properties: plan.properties.length, bookings: plan.bookings.length, reviews: plan.reviews.length, inquiries: plan.inquiries.length },
        },
      });
    },
    { timeout: 120_000 },
  );
  console.log("\nImport complete. Verify in Admin → Bookings / Reviews / Inquiries.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
