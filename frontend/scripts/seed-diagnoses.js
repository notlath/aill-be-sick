/*
  Seed diagnoses for all PATIENT users to test clustering.
  - Creates a Chat per user if none exists
  - Creates a Diagnosis linked to the Chat and User if none exists
  - Uses user's location for latitude/longitude/city/region when available
  Run: npm run seed:diagnoses
*/

const { PrismaClient } = require("../lib/generated/prisma");

const prisma = new PrismaClient();

const DISEASES = ["DENGUE", "PNEUMONIA", "TYPHOID", "IMPETIGO"]; // Prisma enum values
const MODELS = ["BIOCLINICAL_MODERNBERT", "ROBERTA_TAGALOG"]; // Prisma enum values

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randIn(min, max) {
  return Math.random() * (max - min) + min;
}

function makeSymptoms(disease) {
  const examples = {
    DENGUE:
      "I have had high fever, body aches, and occasional rash over the past few days.",
    PNEUMONIA:
      "I am experiencing cough, chest pain, and shortness of breath with fever.",
    TYPHOID:
      "I have prolonged fever, abdominal discomfort, and fatigue with poor appetite.",
    IMPETIGO:
      "I noticed red sores on my skin that have formed yellowish crusts and are itchy.",
  };
  return examples[disease] || "I feel unwell with multiple symptoms recently.";
}

async function ensureChatForUser(userId) {
  // Find any existing chat for the user
  const existing = await prisma.chat.findFirst({ where: { userId } });
  if (existing) return existing;

  const chatId = `seed-${userId}-${Date.now()}`;
  return prisma.chat.create({
    data: {
      chatId,
      userId,
      hasDiagnosis: false,
    },
  });
}

async function seed() {
  try {
    console.log("Seeding diagnoses for PATIENT users...");

    const users = await prisma.user.findMany({ where: { role: "PATIENT" } });
    console.log(`Found ${users.length} PATIENT users.`);

    let created = 0;
    for (const u of users) {
      const hasDiagnosis = await prisma.diagnosis.findFirst({
        where: { userId: u.id },
        orderBy: { createdAt: "desc" },
      });
      if (hasDiagnosis) {
        continue; // skip users who already have at least one diagnosis
      }

      const chat = await ensureChatForUser(u.id);

      const disease = randChoice(DISEASES);
      const modelUsed = randChoice(MODELS);
      const confidence = Math.round(randIn(0.7, 0.98) * 1000) / 1000;
      const uncertainty = Math.round(randIn(0.01, 0.15) * 1000) / 1000;

      await prisma.diagnosis.create({
        data: {
          confidence,
          uncertainty,
          disease,
          modelUsed,
          symptoms: makeSymptoms(disease),
          chatId: chat.chatId,
          userId: u.id,
          latitude: u.latitude ?? null,
          longitude: u.longitude ?? null,
          city: u.city ?? null,
          region: u.region ?? null,
        },
      });

      await prisma.chat.update({
        where: { chatId: chat.chatId },
        data: { hasDiagnosis: true },
      });

      created++;
    }

    console.log(`Done. Created ${created} diagnoses.`);
  } catch (e) {
    console.error("Seeding error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
