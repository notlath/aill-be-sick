/*
  migrate-cdss-knowledge.js — Back-fill disease-specific knowledge references
  in existing CDSS JSON blobs.

  Why:
    The original _build_cdss_payload (backend) used a hardcoded 2-entry
    knowledge list (Dengue + Pneumonia placeholders) regardless of the actual
    disease.  The backend was fixed to return disease-specific entries for new
    diagnoses, but records already in the database still have the old data.
    This script patches them in-place.

  What it touches:
    • TempDiagnosis.cdss  (JSONB, nullable)
    • Diagnosis.cdss      (JSONB, nullable)

  Run:  node scripts/migrate-cdss-knowledge.js
*/

const { PrismaClient } = require("../lib/generated/prisma");

const prisma = new PrismaClient();

// Same mapping used in the backend (_build_cdss_payload)
const KNOWLEDGE_BY_DISEASE = {
  Dengue: [
    {
      topic: "Dengue overview, symptoms and warning signs",
      source: "WHO",
      link: "https://www.who.int/news-room/fact-sheets/detail/dengue-and-severe-dengue",
    },
    {
      topic: "Dengue prevention and mosquito control",
      source: "CDC",
      link: "https://www.cdc.gov/dengue/index.html",
    },
  ],
  Diarrhea: [
    {
      topic: "Diarrhoeal disease overview and treatment",
      source: "WHO",
      link: "https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease",
    },
    {
      topic: "Diarrhea prevention and oral rehydration",
      source: "CDC",
      link: "https://www.cdc.gov/diarrhea/index.html",
    },
  ],
  Influenza: [
    {
      topic: "Seasonal influenza overview and vaccination",
      source: "WHO",
      link: "https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)",
    },
    {
      topic: "Flu symptoms, treatment and prevention",
      source: "CDC",
      link: "https://www.cdc.gov/flu/index.html",
    },
  ],
  Measles: [
    {
      topic: "Measles overview, symptoms and complications",
      source: "WHO",
      link: "https://www.who.int/news-room/fact-sheets/detail/measles",
    },
    {
      topic: "Measles signs, vaccination and prevention",
      source: "CDC",
      link: "https://www.cdc.gov/measles/index.html",
    },
  ],
  Pneumonia: [
    {
      topic: "Pneumonia causes, prevention and treatment",
      source: "WHO",
      link: "https://www.who.int/news-room/fact-sheets/detail/pneumonia",
    },
    {
      topic: "Pneumonia symptoms and risk factors",
      source: "CDC",
      link: "https://www.cdc.gov/pneumonia/index.html",
    },
  ],
  Typhoid: [
    {
      topic: "Typhoid fever overview and vaccination",
      source: "WHO",
      link: "https://www.who.int/news-room/fact-sheets/detail/typhoid",
    },
    {
      topic: "Typhoid fever symptoms, treatment and prevention",
      source: "CDC",
      link: "https://www.cdc.gov/typhoid-fever/index.html",
    },
  ],
};

const FALLBACK_KNOWLEDGE = [
  {
    topic: "General health information",
    source: "WHO",
    link: "https://www.who.int/health-topics",
  },
];

/**
 * Update a single record's cdss.knowledge based on its disease.
 * Returns true if the record was actually updated.
 */
function patchKnowledge(cdss, disease) {
  if (!cdss || typeof cdss !== "object") return null;
  const newKnowledge = KNOWLEDGE_BY_DISEASE[disease] || FALLBACK_KNOWLEDGE;
  return { ...cdss, knowledge: newKnowledge };
}

async function migrateTable(modelName, model) {
  const records = await model.findMany({
    where: { cdss: { not: null } },
    select: { id: true, disease: true, cdss: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const record of records) {
    const patched = patchKnowledge(record.cdss, record.disease);
    if (!patched) {
      skipped++;
      continue;
    }

    await model.update({
      where: { id: record.id },
      data: { cdss: patched },
    });
    updated++;
  }

  console.log(
    `  ${modelName}: ${updated} updated, ${skipped} skipped (null/invalid cdss), ${records.length} total with cdss`
  );
}

async function main() {
  console.log("Migrating CDSS knowledge entries to disease-specific references...\n");

  await migrateTable("TempDiagnosis", prisma.tempDiagnosis);
  await migrateTable("Diagnosis", prisma.diagnosis);

  console.log("\nDone.");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
