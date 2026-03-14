import { PrismaClient } from "../lib/generated/prisma";
import * as crypto from "crypto";

const prisma = new PrismaClient();

// Configuration for the simulated outbreak
const DISEASE = "DENGUE";
const DISTRICT = "Barangay Proper";
const DISTRICT_LAT = 14.697817;
const DISTRICT_LNG = 121.108978;
const RADIUS_DEG = 0.003;

function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Box-Muller Gaussian sample for realistic geographic clustering
function gaussianRand(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function jitteredCoord(centLat: number, centLng: number, radiusDeg: number) {
  const lat = centLat + gaussianRand() * radiusDeg * 0.35;
  const lng = centLng + gaussianRand() * radiusDeg * 0.35;
  return {
    latitude: Math.min(Math.max(lat, centLat - radiusDeg), centLat + radiusDeg),
    longitude: Math.min(Math.max(lng, centLng - radiusDeg), centLng + radiusDeg),
  };
}

async function createCase(isBaseline = false) {
  const age = randInt(5, 60);
  const now = new Date();
  const birthdayYear = now.getFullYear() - age;
  // Use a fixed month/day for simplicity; age calculation trigger will use this
  const birthday = new Date(birthdayYear, 0, 1);
  const { latitude, longitude } = jitteredCoord(DISTRICT_LAT, DISTRICT_LNG, RADIUS_DEG);
  const idStr = crypto.randomBytes(4).toString("hex");

  // Time distribution
  let createdAt: Date;
  if (isBaseline) {
    // Spread baseline cases randomly between 8 and 30 days ago
    const daysAgo = randInt(8, 30);
    createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  } else {
    // Cluster spike cases within the last 3 days
    const daysAgo = randInt(0, 3);
    createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
  }

  const user = await prisma.user.create({
    data: {
      email: `outbreak_test_${isBaseline ? "base" : "spike"}_${idStr}@example.com`,
      name: `Outbreak Test ${idStr}`,
      role: "PATIENT",
      gender: randChoice(["MALE", "FEMALE"]),
      birthday,
      region: "National Capital Region (NCR)",
      province: "NCR, Second District (Not a Province)",
      city: "Quezon City",
      barangay: "Bagong Silangan",
      district: DISTRICT,
      latitude,
      longitude,
    },
  });

  const chatId = `chat-outbreak-${idStr}`;
  await prisma.chat.create({
    data: {
      chatId,
      userId: user.id,
      hasDiagnosis: true,
      createdAt,
    },
  });

  const diagnosis = await prisma.diagnosis.create({
    data: {
      confidence: 0.95,
      uncertainty: 0.05,
      disease: DISEASE,
      modelUsed: "BIOCLINICAL_MODERNBERT",
      symptoms: "I have had high fever, severe headache, and joint pain for the past few days.",
      chatId,
      userId: user.id,
      latitude,
      longitude,
      city: "Quezon City",
      province: "NCR, Second District (Not a Province)",
      barangay: "Bagong Silangan",
      region: "National Capital Region (NCR)",
      district: DISTRICT,
      createdAt,
    },
  });
  
  return diagnosis;
}

async function seed() {
  try {
    console.log(`\n🦠 Seeding Outbreak Scenario for ${DISEASE} in ${DISTRICT}...`);
    
    // 1. Create Baseline (used to calculate mean & std dev)
    console.log(`\n⏳ Seeding 15 baseline cases (8-30 days ago)...`);
    for (let i = 0; i < 15; i++) {
      await createCase(true);
    }
    
    // 2. Create Spike (recent cases that breach the threshold)
    console.log(`\n🔥 Seeding 15 sudden spike cases (0-3 days ago)...`);
    for (let i = 0; i < 15; i++) {
      await createCase(false);
    }
    
    console.log("\n✅ Done! The database now has a simulated outbreak.");
    console.log(`\nNext Steps:`);
    console.log(`1. Ensure the Flask backend is running.`);
    console.log(`2. Trigger the outbreak detection by hitting:`);
    console.log(`   GET http://localhost:10000/api/surveillance/outbreaks/detect`);
    console.log(`3. Or, create a new diagnosis from the frontend to trigger the background check.`);
    
  } catch (e) {
    console.error("\n❌ Seeding error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

seed();