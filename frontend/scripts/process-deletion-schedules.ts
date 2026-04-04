/**
 * CLI script to process expired deletion schedules.
 *
 * This script finds all DeletionSchedule records where:
 * - status = SCHEDULED
 * - scheduledDeletionAt <= now
 *
 * For each, it anonymizes the user's PII and marks the schedule as ANONYMIZED.
 *
 * Usage:
 *   bun run scripts/process-deletion-schedules.ts
 *
 * Or add to package.json:
 *   "scripts": { "process-deletions": "bun run scripts/process-deletion-schedules.ts" }
 */

import prisma from "../prisma/prisma";

async function processDeletionSchedules() {
  console.log("[deletion-schedules] Starting processing...");

  const now = new Date();

  const expiredSchedules = await prisma.deletionSchedule.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDeletionAt: { lte: now },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (expiredSchedules.length === 0) {
    console.log("[deletion-schedules] No expired schedules found.");
    return;
  }

  console.log(`[deletion-schedules] Found ${expiredSchedules.length} expired schedule(s).`);

  let anonymizedCount = 0;

  for (const schedule of expiredSchedules) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: schedule.userId },
          data: {
            email: `deleted_${schedule.userId}@anonymous.com`,
            name: "Anonymous User",
            city: null,
            latitude: null,
            longitude: null,
            region: null,
            age: null,
            gender: null,
            province: null,
            barangay: null,
            birthday: null,
            district: null,
            address: null,
            privacyAcceptedAt: null,
            privacyVersion: null,
            termsAcceptedAt: null,
            termsVersion: null,
          },
        });

        await tx.diagnosis.updateMany({
          where: { userId: schedule.userId },
          data: {
            city: null,
            latitude: null,
            longitude: null,
            region: null,
            province: null,
            barangay: null,
            district: null,
          },
        });

        await tx.chat.deleteMany({
          where: { userId: schedule.userId },
        });

        await tx.deletionSchedule.update({
          where: { id: schedule.id },
          data: {
            status: "ANONYMIZED",
            anonymizedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            action: "ANONYMIZE_ACCOUNT",
            details: {
              patientId: schedule.userId,
              scheduleId: schedule.id,
              originalEmail: schedule.user.email,
            },
          },
        });
      });

      console.log(
        `[deletion-schedules] Anonymized user ${schedule.user.email} (id: ${schedule.userId})`
      );
      anonymizedCount++;
    } catch (error) {
      console.error(
        `[deletion-schedules] Failed to anonymize user ${schedule.user.email}:`,
        error
      );
    }
  }

  console.log(`[deletion-schedules] Done. Anonymized ${anonymizedCount}/${expiredSchedules.length} account(s).`);
}

processDeletionSchedules()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[deletion-schedules] Fatal error:", error);
    process.exit(1);
  });
