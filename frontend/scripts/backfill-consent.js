/*
  backfill-consent.js — Set privacy and terms acceptance timestamps for all existing users.

  Run this script once to mark all existing users as having accepted the privacy policy
  and terms of service. This is useful when adding consent tracking to an existing database.

  Run: node scripts/backfill-consent.js
*/

const { PrismaClient } = require("../lib/generated/prisma");

const prisma = new PrismaClient();

async function backfillConsent() {
  try {
    const now = new Date();

    console.log("Updating all users to accept privacy and terms...");

    const result = await prisma.user.updateMany({
      where: {
        OR: [
          { privacyAcceptedAt: null },
          { termsAcceptedAt: null },
        ],
      },
      data: {
        privacyAcceptedAt: now,
        privacyVersion: "1.0",
        termsAcceptedAt: now,
        termsVersion: "1.0",
      },
    });

    console.log(`Done! Updated ${result.count} users.`);
  } catch (e) {
    console.error("Error backfilling consent:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

backfillConsent();
