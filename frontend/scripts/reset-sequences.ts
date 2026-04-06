/**
 * Reset PostgreSQL sequences to match current MAX(id) values.
 *
 * This fixes "Unique constraint failed on the fields: (id)" errors
 * that occur when the auto-increment sequence is out of sync.
 *
 * Run: npx tsx scripts/reset-sequences.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import prisma from "@/prisma/prisma";

async function resetSequence(table: string, column: string = "id") {
  const maxResult = await prisma.$queryRawUnsafe<{ max: number | null }[]>(
    `SELECT MAX("${column}") as max FROM "${table}"`,
  );
  const maxId = maxResult[0]?.max ?? 0;
  const nextVal = maxId + 1;

  await prisma.$executeRawUnsafe(
    `SELECT setval(pg_get_serial_sequence('"${table}"', '${column}'), ${nextVal}, false)`,
  );

  console.log(`  ✓ ${table}.${column} sequence reset to ${nextVal}`);
}

async function main() {
  console.log("Resetting PostgreSQL sequences...\n");

  try {
    await resetSequence("User");
    await resetSequence("Chat");
    await resetSequence("Message");
    await resetSequence("TempDiagnosis");
    await resetSequence("Diagnosis");
    await resetSequence("Explanation");
    await resetSequence("DiagnosisOverride");
    await resetSequence("Alert");
    await resetSequence("AlertNote");
    await resetSequence("AllowedClinicianEmail");
    await resetSequence("DiagnosisNote");
    await resetSequence("AuditLog");
    await resetSequence("DeletionSchedule");

    console.log("\n✅ All sequences reset successfully.");
  } catch (error) {
    console.error("❌ Failed to reset sequences:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
