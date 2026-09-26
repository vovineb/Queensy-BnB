// Production-safe seed: reference data + the real Queensy listings that were
// hard-coded in the legacy app (src/properties.js). Idempotent (upserts only).
// It creates NO fake bookings, reviews or users. An admin account is created
// only when SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are provided.
import { hash } from "@node-rs/argon2";
import { prisma } from "../scripts/db";

const AMENITIES = [
  { slug: "wifi", name: "Wi-Fi", icon: "Wifi", category: "Essentials" },
  { slug: "air-conditioning", name: "Air conditioning", icon: "AirVent", category: "Comfort" },
  { slug: "fan", name: "Ceiling fan", icon: "Fan", category: "Comfort" },
  { slug: "kitchen", name: "Kitchen", icon: "CookingPot", category: "Essentials" },
  { slug: "pool", name: "Swimming pool", icon: "Waves", category: "Outdoors" },
  { slug: "bathtub", name: "Bathtub", icon: "Bath", category: "Comfort" },
  { slug: "beach-access", name: "Near the beach", icon: "Umbrella", category: "Location" },
  { slug: "security", name: "24/7 security", icon: "ShieldCheck", category: "Safety" },
  { slug: "parking", name: "Free parking", icon: "Car", category: "Essentials" },
  { slug: "hot-water", name: "Hot water", icon: "ShowerHead", category: "Essentials" },
  { slug: "tv", name: "TV", icon: "Tv", category: "Entertainment" },
  { slug: "workspace", name: "Dedicated workspace", icon: "Laptop", category: "Work" },
  { slug: "washer", name: "Washing machine", icon: "WashingMachine", category: "Essentials" },
  { slug: "balcony", name: "Balcony", icon: "Fence", category: "Outdoors" },
  { slug: "garden", name: "Garden", icon: "Trees", category: "Outdoors" },
  { slug: "backup-power", name: "Backup power", icon: "BatteryCharging", category: "Essentials" },
  { slug: "housekeeping", name: "Housekeeping", icon: "Sparkles", category: "Services" },
  { slug: "airport-transfer", name: "Airport transfer on request", icon: "Plane", category: "Services" },
];

const DIANI = {
  slug: "diani",
  name: "Diani",
  region: "Kwale County",
  country: "KE",
  summary: "White-sand beaches, warm Indian Ocean water and a relaxed coastal pace, about 30 km south of Mombasa.",
  description: [
    "Diani Beach runs for roughly 17 km along Kenya's south coast in Kwale County and is regularly named one of Africa's best beaches. Coral reefs keep the lagoon calm at low tide, which makes it good for swimming, snorkelling and kitesurfing.",
    "Getting there: fly into Ukunda airstrip (a few minutes from the beach) or Moi International Airport in Mombasa, then continue south via the Likoni ferry or the Dongo Kundu bypass.",
    "Good to know: the dry, sunny months are roughly December–March and July–October. Look out for the protected Angolan colobus monkeys that live in the coastal forest along Diani Beach Road.",
  ].join("\n\n"),
  featured: true,
  sortOrder: 1,
};

// Values below come from the legacy listings. Fields the legacy app did not
// record (guest capacity, bathrooms) use conservative defaults — verify them
// in Admin → Properties before relying on them.
const PROPERTIES = [
  {
    legacyId: "legacy-1",
    slug: "chameleone-1",
    name: "Chameleone 1",
    type: "APARTMENT" as const,
    summary: "Cozy 1-bedroom with beach charm.",
    description: "Cozy 1-bedroom apartment with beach charm in Diani, on Kenya's south coast.",
    bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 2,
    basePrice: 550000,
    amenities: ["wifi", "fan", "kitchen"],
    rooms: [],
  },
  {
    legacyId: "legacy-2",
    slug: "chameleone-2",
    name: "Chameleone 2",
    type: "SUITE" as const,
    summary: "Private suite with palm view.",
    description: "Private suite with a palm view in Diani, on Kenya's south coast.",
    bedrooms: 1, beds: 1, bathrooms: 1, maxGuests: 2,
    basePrice: 550000,
    amenities: ["wifi", "air-conditioning", "security"],
    rooms: [],
  },
  {
    legacyId: "legacy-3",
    slug: "wendys-penthouse",
    name: "Wendy's Penthouse",
    type: "PENTHOUSE" as const,
    summary: "Luxury 3-bedroom penthouse with pool and bathtub, 10 minutes to the beach.",
    description: "Luxury 3-bedroom penthouse with king, queen and double beds. Pool, bathtub, and 10 minutes to the beach.",
    bedrooms: 3, beds: 3, bathrooms: 1, maxGuests: 6,
    basePrice: 1550000,
    amenities: ["pool", "wifi", "bathtub", "beach-access", "air-conditioning"],
    rooms: [
      { name: "Bedroom 1", beds: "1 king bed" },
      { name: "Bedroom 2", beds: "1 queen bed" },
      { name: "Bedroom 3", beds: "1 double bed" },
    ],
  },
];

async function main() {
  for (const a of AMENITIES) {
    await prisma.amenity.upsert({ where: { slug: a.slug }, create: a, update: { name: a.name, icon: a.icon, category: a.category } });
  }
  const diani = await prisma.destination.upsert({ where: { slug: DIANI.slug }, create: DIANI, update: {} });

  for (const p of PROPERTIES) {
    const existing = await prisma.property.findUnique({ where: { slug: p.slug } });
    if (existing) continue; // never overwrite admin edits
    const amenityRows = await prisma.amenity.findMany({ where: { slug: { in: p.amenities } } });
    await prisma.property.create({
      data: {
        legacyId: p.legacyId,
        slug: p.slug,
        name: p.name,
        type: p.type,
        status: "PUBLISHED",
        publishedAt: new Date(),
        summary: p.summary,
        description: p.description,
        destinationId: diani.id,
        neighborhood: "Diani Beach",
        bedrooms: p.bedrooms,
        beds: p.beds,
        bathrooms: p.bathrooms,
        maxGuests: p.maxGuests,
        currency: "KES",
        basePrice: p.basePrice,
        amenities: { create: amenityRows.map((a) => ({ amenityId: a.id })) },
        rooms: { create: p.rooms.map((r, i) => ({ ...r, sortOrder: i })) },
      },
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) throw new Error("SEED_ADMIN_PASSWORD must be at least 12 characters");
    const passwordHash = await hash(adminPassword, { memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: { email: adminEmail, name: process.env.SEED_ADMIN_NAME || "Queensy Admin", passwordHash, role: "ADMIN", emailVerifiedAt: new Date() },
      update: { role: "ADMIN" },
    });
    console.log(`Admin account ready: ${adminEmail}`);
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
