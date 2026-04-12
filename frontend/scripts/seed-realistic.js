/*
  seed-realistic.js — Epidemiologically meaningful seed data for Bagong Silangan.

  What this script does:
    1. Wipes all PATIENT users EXCEPT the IDs listed in PRESERVE_USER_IDS
       (Prisma's onDelete: Cascade removes their linked Diagnoses and Chats too).
    2. Creates 500 new PATIENT users, each placed inside a specific district of
       Bagong Silangan with realistic population weighting. Coordinates are
       jittered around district centroids and constrained to stay inside each
       district polygon (from public/geojson/bagong_silangan.geojson).
    3. Defines two outbreak events baked into a 6-month time window:
         • Dengue surge   — weeks 8–10,  concentrated in Barangay Proper + Filinvest 2
         • Typhoid cluster — weeks 14–16, concentrated in Sitio Bakal + Covenant Village
    4. Gives each user 1–3 Diagnosis records (each linked to a minimal Chat).
       Outbreak users' diagnoses are timestamped inside their outbreak window.
    5. Sets district / latitude / longitude on both User and Diagnosis in one pass.

  Run: node scripts/seed-realistic.js
  Or:  npm run seed:realistic
*/

const path = require("path");
const fs = require("fs");
const turf = require("@turf/turf");
const { PrismaClient } = require("../lib/generated/prisma");

const prisma = new PrismaClient();

// Load district polygons from GeoJSON so we can keep seeded points inside bounds
const GEOJSON_PATH = path.join(
  __dirname,
  "../public/geojson/bagong_silangan.geojson",
);
const GEOJSON = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf8"));
const DISTRICT_POLYGONS = new Map();
for (const f of GEOJSON.features) {
  const name = f.properties && f.properties.name;
  if (name && f.geometry && f.geometry.type === "Polygon") {
    DISTRICT_POLYGONS.set(name, f);
  }
}

// ─── Configuration ────────────────────────────────────────────────────────────

const TOTAL_USERS = 500;

// These user IDs will never be touched (real accounts)
// Add hardcoded IDs here if needed, but the script also dynamically preserves non-PATIENT users
const PRESERVE_USER_IDS = [5];

const DISEASES = [
  "DENGUE",
  "PNEUMONIA",
  "TYPHOID",
  "DIARRHEA",
  "MEASLES",
  "INFLUENZA",
];
const MODELS = ["BIOCLINICAL_MODERNBERT", "ROBERTA_TAGALOG"];

// 6-month window ending today
const NOW = new Date();
const WINDOW_MS = 6 * 30 * 24 * 60 * 60 * 1000; // ~6 months
const WINDOW_START = new Date(NOW.getTime() - WINDOW_MS);

// Outbreak definitions — week offsets from WINDOW_START (each week = 7 days)
const OUTBREAKS = [
  {
    name: "Dengue surge",
    disease: "DENGUE",
    weekStart: 8,
    weekEnd: 10,
    districts: ["Barangay Proper", "Filinvest 2"],
    targetCases: 60, // how many outbreak diagnoses to create
  },
  {
    name: "Typhoid cluster",
    disease: "TYPHOID",
    weekStart: 14,
    weekEnd: 16,
    districts: ["Sitio Bakal", "Covenant Village"],
    targetCases: 30,
  },
];

// ─── District definitions ─────────────────────────────────────────────────────
//
// Centroids and radii derived from the GeoJSON bounding boxes.
// We jitter coordinates around the centroid with a Gaussian spread capped at
// the given radius so points stay inside (or very close to) their polygon.
//
// populationWeight: relative share of the 500 users assigned to this district.

const DISTRICTS = [
  // High density
  {
    name: "Barangay Proper",
    centLat: 14.697817,
    centLng: 121.108978,
    radiusDeg: 0.003,
    populationWeight: 14,
  },
  {
    name: "Filinvest 2",
    centLat: 14.698897,
    centLng: 121.10295,
    radiusDeg: 0.004,
    populationWeight: 13,
  },
  // Medium density
  {
    name: "Violago Homes",
    centLat: 14.699831,
    centLng: 121.100241,
    radiusDeg: 0.0015,
    populationWeight: 10,
  },
  {
    name: "Covenant Village",
    centLat: 14.695807,
    centLng: 121.107549,
    radiusDeg: 0.001,
    populationWeight: 8,
  },
  {
    name: "Filinvest Heights - Brookside",
    centLat: 14.700589,
    centLng: 121.113588,
    radiusDeg: 0.004,
    populationWeight: 10,
  },
  // Low density
  {
    name: "Sugartowne",
    centLat: 14.692106,
    centLng: 121.101076,
    radiusDeg: 0.0015,
    populationWeight: 7,
  },
  {
    name: "Spring Valley",
    centLat: 14.710173,
    centLng: 121.109643,
    radiusDeg: 0.002,
    populationWeight: 7,
  },
  {
    name: "Parkwoods",
    centLat: 14.725636,
    centLng: 121.116978,
    radiusDeg: 0.003,
    populationWeight: 7,
  },
  {
    name: "Sitio Bakal",
    centLat: 14.709699,
    centLng: 121.119525,
    radiusDeg: 0.0025,
    populationWeight: 6,
  },
  // Sparse
  {
    name: "Sitio Veterans",
    centLat: 14.706392,
    centLng: 121.107016,
    radiusDeg: 0.004,
    populationWeight: 4,
  },
  {
    name: "DSWD",
    centLat: 14.693852,
    centLng: 121.098877,
    radiusDeg: 0.002,
    populationWeight: 2,
  },
  {
    name: "Agri Land",
    centLat: 14.717332,
    centLng: 121.118672,
    radiusDeg: 0.006,
    populationWeight: 2,
  },
];

// Pre-build a weighted sampling array
const DISTRICT_POOL = [];
for (const d of DISTRICTS) {
  for (let i = 0; i < d.populationWeight; i++) DISTRICT_POOL.push(d);
}

// ─── Name / demographic data ──────────────────────────────────────────────────

const FIRST_NAMES = [
  "Juan",
  "Maria",
  "Jose",
  "Ana",
  "Pedro",
  "Rosa",
  "Carlos",
  "Carmen",
  "Miguel",
  "Elena",
  "Antonio",
  "Luisa",
  "Francisco",
  "Mercedes",
  "Javier",
  "Teresa",
  "Fernando",
  "Patricia",
  "Ricardo",
  "Monica",
  "Eduardo",
  "Gabriela",
  "Luis",
  "Silvia",
  "Alejandro",
  "Claudia",
  "Diego",
  "Valeria",
  "Andres",
  "Natalia",
  "Sebastian",
  "Daniela",
  "Mateo",
  "Isabella",
  "Gabriel",
  "Sofia",
  "Rafael",
  "Camila",
  "David",
  "Lucia",
  "Mario",
  "Andrea",
  "Jorge",
  "Paula",
  "Oscar",
  "Diana",
  "Ramon",
  "Flor",
  "Emilio",
  "Veronica",
  "Adrian",
  "Jessica",
  "Kenneth",
  "Rowena",
  "Rodel",
  "Liezl",
  "Mark",
  "Sheila",
  "Ariel",
  "Charmaine",
  "Ryan",
  "Irene",
  "Noel",
  "Glenda",
  "Edwin",
  "Maricel",
  "Ronaldo",
  "Jennie",
  "Jayson",
  "Lourdes",
];

const LAST_NAMES = [
  "Santos",
  "Rodriguez",
  "Cruz",
  "Garcia",
  "Martinez",
  "Lopez",
  "Gonzalez",
  "Perez",
  "Sanchez",
  "Ramirez",
  "Torres",
  "Flores",
  "Rivera",
  "Gomez",
  "Diaz",
  "Reyes",
  "Castro",
  "Morales",
  "Ortiz",
  "Gutierrez",
  "Chavez",
  "Ramos",
  "Vargas",
  "Castillo",
  "Jimenez",
  "Moreno",
  "Romero",
  "Herrera",
  "Medina",
  "Aguilar",
  "Vega",
  "Mendez",
  "Guerrero",
  "Navarro",
  "Mendoza",
  "Ruiz",
  "Fernandez",
  "Alvarez",
  "Silva",
  "Soto",
  "Delgado",
  "Rojas",
  "Ibarra",
  "Miranda",
  "Acosta",
  "Estrada",
  "Campos",
  "Barrera",
  "dela Cruz",
  "Reyes",
  "Bautista",
  "Villanueva",
  "Aquino",
  "Ocampo",
  "Pascual",
  "Bonifacio",
  "Catalan",
];

const GENDERS = ["MALE", "FEMALE", "OTHER"];

const SYMPTOM_MAP = {
  DENGUE:
    "I have had high fever, body aches, joint pain, and a rash over the past few days.",
  PNEUMONIA:
    "I am experiencing persistent cough, chest pain, and shortness of breath with fever.",
  TYPHOID:
    "I have prolonged high fever, abdominal discomfort, and fatigue with poor appetite.",
  DIARRHEA:
    "I have been having frequent loose stools, stomach cramps, and mild fever since yesterday.",
  MEASLES:
    "I have a fever, cough, runny nose, and I developed a red blotchy rash starting on my face.",
  INFLUENZA:
    "I have sudden high fever, severe headache, muscle aches, and fatigue along with a dry cough.",
};

// ─── Utility functions ────────────────────────────────────────────────────────

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randIn(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(randIn(min, max + 1));
}

// Box-Muller Gaussian sample
function gaussianRand() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Generate a coordinate jittered around (centLat, centLng) within radiusDeg.
// Gaussian is scaled to 0.35 * radius so the 3-sigma point is ~1.05 * radius,
// then hard-clamped so all points stay within the district bounding box.
function jitteredCoord(centLat, centLng, radiusDeg) {
  const lat = centLat + gaussianRand() * radiusDeg * 0.35;
  const lng = centLng + gaussianRand() * radiusDeg * 0.35;
  return {
    latitude: Math.min(Math.max(lat, centLat - radiusDeg), centLat + radiusDeg),
    longitude: Math.min(
      Math.max(lng, centLng - radiusDeg),
      centLng + radiusDeg,
    ),
  };
}

// Generate a point inside the given district polygon by jittering around the
// centroid and retrying until the point falls inside the polygon (from GeoJSON).
// Falls back to a point-on-polygon (guaranteed inside) if no valid point after maxRetries.
function jitteredCoordInDistrict(district) {
  const { centLat, centLng, radiusDeg, name } = district;
  const polygonFeature = DISTRICT_POLYGONS.get(name);
  const maxRetries = 100;

  if (!polygonFeature) {
    return jitteredCoord(centLat, centLng, radiusDeg);
  }

  for (let i = 0; i < maxRetries; i++) {
    const { latitude, longitude } = jitteredCoord(centLat, centLng, radiusDeg);
    const point = turf.point([longitude, latitude]);
    if (turf.booleanPointInPolygon(point, polygonFeature)) {
      return { latitude, longitude };
    }
  }

  const onFeature = turf.pointOnFeature(polygonFeature);
  const [lng, lat] = onFeature.geometry.coordinates;
  return { latitude: lat, longitude: lng };
}

// Map week offset to a random Date within that week
function dateInWeek(weekOffset) {
  const weekStartMs =
    WINDOW_START.getTime() + weekOffset * 7 * 24 * 60 * 60 * 1000;
  const weekEndMs = weekStartMs + 7 * 24 * 60 * 60 * 1000;
  return new Date(weekStartMs + Math.random() * (weekEndMs - weekStartMs));
}

// Random date anywhere in the 6-month window
function randomDate() {
  return new Date(WINDOW_START.getTime() + Math.random() * WINDOW_MS);
}

function generateEmail(firstName, lastName, index) {
  const domains = [
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "icloud.com",
  ];
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${randChoice(domains)}`;
}

// ─── Build the outbreak assignment map ───────────────────────────────────────
//
// We pre-allocate outbreak "slots". When a user is assigned to an outbreak
// district we pull the next slot and use that disease + week window for one
// of their diagnoses.

function buildOutbreakSlots() {
  const slots = [];
  for (const ob of OUTBREAKS) {
    for (let i = 0; i < ob.targetCases; i++) {
      slots.push({
        disease: ob.disease,
        weekStart: ob.weekStart,
        weekEnd: ob.weekEnd,
        districts: ob.districts,
      });
    }
  }
  // Shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots;
}

// ─── Main seeding logic ───────────────────────────────────────────────────────

async function seed() {
  try {
    // 1. Delete all PATIENT users except preserved IDs (cascade removes their
    //    Diagnoses and Chats automatically via onDelete: Cascade)
    console.log(
      "Removing existing seeded PATIENT users (preserving real accounts)...",
    );

    // Dynamically preserve all non-PATIENT users (clinicians, admins, developers)
    const nonPatients = await prisma.user.findMany({
      where: { role: { not: "PATIENT" } },
      select: { id: true },
    });
    const dynamicPreserve = nonPatients.map((u) => u.id);
    const allPreserve = [
      ...new Set([...PRESERVE_USER_IDS, ...dynamicPreserve]),
    ];

    if (allPreserve.length > 0) {
      console.log(
        `  Preserving ${allPreserve.length} non-patient account(s): ${allPreserve.join(", ")}`,
      );
    }

    const deleted = await prisma.user.deleteMany({
      where: {
        role: "PATIENT",
        id: { notIn: allPreserve },
      },
    });
    console.log(`  Deleted ${deleted.count} users.\n`);

    // 2. Prepare outbreak slots
    const outbreakSlots = buildOutbreakSlots();
    let slotIndex = 0;

    // Build a fast lookup: district name → slots that apply to it
    function nextOutbreakSlotForDistrict(districtName) {
      for (let i = slotIndex; i < outbreakSlots.length; i++) {
        if (outbreakSlots[i].districts.includes(districtName)) {
          const slot = outbreakSlots[i];
          // Remove from pool by swapping with slotIndex position
          [outbreakSlots[i], outbreakSlots[slotIndex]] = [
            outbreakSlots[slotIndex],
            outbreakSlots[i],
          ];
          slotIndex++;
          return slot;
        }
      }
      return null;
    }

    // 3. Create users + chats + diagnoses
    console.log(
      `Creating ${TOTAL_USERS} users with realistic location and disease data...`,
    );

    let usersCreated = 0;
    let diagnosesCreated = 0;
    let emailIndex = 1000; // start high to avoid collisions with preserved users

    for (let i = 0; i < TOTAL_USERS; i++) {
      const firstName = randChoice(FIRST_NAMES);
      const lastName = randChoice(LAST_NAMES);
      const name = `${firstName} ${lastName}`;
      const email = generateEmail(firstName, lastName, emailIndex++);
      const age = randInt(5, 80);
      const gender = randChoice(GENDERS);

      // Compute a birthday consistent with the random age.
      // We pass both age and birthday since the DB trigger may not exist.
      const now = new Date();
      const birthdayYear = now.getFullYear() - age;
      const birthdayMonth = randInt(0, 11); // 0-indexed month
      const birthdayDay = randInt(1, 28); // safe day for all months
      const birthday = new Date(birthdayYear, birthdayMonth, birthdayDay);

      // Pick district by population weight
      const district = randChoice(DISTRICT_POOL);
      const { latitude, longitude } = jitteredCoordInDistrict(district);

      // Create user — pass both age and birthday
      const user = await prisma.user.create({
        data: {
          email,
          name,
          role: "PATIENT",
          gender,
          age,
          birthday,
          region: "National Capital Region (NCR)",
          province: "NCR, Second District (Not a Province)",
          city: "Quezon City",
          barangay: "Bagong Silangan",
          district: district.name,
          latitude,
          longitude,
        },
      });
      usersCreated++;

      // Number of diagnoses for this user: 1–3
      const diagCount = randInt(1, 3);

      for (let d = 0; d < diagCount; d++) {
        // Try to consume an outbreak slot for this district on the first diagnosis
        const slot =
          d === 0 ? nextOutbreakSlotForDistrict(district.name) : null;

        const disease = slot ? slot.disease : randChoice(DISEASES);
        const modelUsed = randChoice(MODELS);
        const confidence = Math.round(randIn(0.72, 0.98) * 1000) / 1000;
        const uncertainty = Math.round(randIn(0.01, 0.18) * 1000) / 1000;
        const symptoms =
          SYMPTOM_MAP[disease] ?? "I feel unwell with multiple symptoms.";

        // Timestamp: outbreak window or random
        const createdAt = slot
          ? dateInWeek(randInt(slot.weekStart, slot.weekEnd))
          : randomDate();

        const chatId = `seed-r-${user.id}-${d}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        // Create Chat
        await prisma.chat.create({
          data: {
            chatId,
            userId: user.id,
            hasDiagnosis: true,
            createdAt,
          },
        });

        // Status: first 10 stay PENDING, rest are VERIFIED
        const isPending = diagnosesCreated < 10;
        const status = isPending ? "PENDING" : "VERIFIED";
        const verifiedAt = isPending ? null : createdAt;

        // Create Diagnosis
        await prisma.diagnosis.create({
          data: {
            confidence,
            uncertainty,
            disease,
            modelUsed,
            symptoms,
            chatId,
            userId: user.id,
            latitude,
            longitude,
            city: "Quezon City",
            province: "NCR, Second District (Not a Province)",
            barangay: "Bagong Silangan",
            region: "National Capital Region (NCR)",
            district: district.name,
            status,
            verifiedAt,
            createdAt,
          },
        });

        diagnosesCreated++;
      }

      if (usersCreated % 50 === 0) {
        console.log(
          `  Created ${usersCreated}/${TOTAL_USERS} users (${diagnosesCreated} diagnoses so far)...`,
        );
      }
    }

    // 4. Summary
    console.log(`\nDone!`);
    console.log(`  Users created:     ${usersCreated}`);
    console.log(`  Diagnoses created: ${diagnosesCreated}`);
    console.log(
      `  Outbreak slots used: ${slotIndex} / ${outbreakSlots.length + slotIndex}`,
    );

    // District breakdown
    const distBreakdown = await prisma.diagnosis.groupBy({
      by: ["district"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });
    console.log("\nDiagnosis breakdown by district:");
    for (const row of distBreakdown) {
      console.log(`  ${(row.district ?? "null").padEnd(36)} ${row._count.id}`);
    }
  } catch (e) {
    console.error("Seeding error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
