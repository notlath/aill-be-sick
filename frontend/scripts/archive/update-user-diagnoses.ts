// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("../lib/generated/prisma");
import * as path from "path";

const prisma = new PrismaClient();

interface DiagnosisUpdate {
  id: number;
  latitude: number | null;
  longitude: number | null;
  district: string | null;
}

// Update diagnoses with user coordinates and districts
async function updateDiagnosesWithUserCoords() {
  try {
    // Fetch all diagnoses with their associated users
    console.log("📥 Fetching diagnoses with user data from database...");
    const diagnoses = await prisma.diagnosis.findMany({
      include: {
        user: {
          select: {
            latitude: true,
            longitude: true,
            district: true,
          },
        },
      },
    });
    console.log(`Found ${diagnoses.length} diagnoses to update\n`);

    if (diagnoses.length === 0) {
      console.log("⚠️  No diagnoses found in database. Nothing to update.");
      return;
    }

    // Prepare updates
    const updates: DiagnosisUpdate[] = [];
    let updateCount = 0;
    let skipCount = 0;

    for (const diagnosis of diagnoses) {
      const user = diagnosis.user;
      
      // Only update if user has coordinates
      if (user.latitude !== null && user.longitude !== null) {
        updates.push({
          id: diagnosis.id,
          latitude: user.latitude,
          longitude: user.longitude,
          district: user.district,
        });
        updateCount++;
      } else {
        skipCount++;
      }
    }

    console.log(
      `✅ Prepared ${updateCount} diagnosis updates (${skipCount} skipped due to missing user coordinates)\n`,
    );

    // Show summary of users with coordinates
    const usersWithCoords = updateCount;
    const usersWithoutCoords = skipCount;
    console.log("📊 Summary:");
    console.log(`  Diagnoses with user coordinates: ${usersWithCoords}`);
    console.log(`  Diagnoses without user coordinates: ${usersWithoutCoords}`);
    if (diagnoses.length > 0) {
      console.log(
        `  Coverage: ${((usersWithCoords / diagnoses.length) * 100).toFixed(1)}%`,
      );
    }
    console.log();

    if (updates.length === 0) {
      console.log("⚠️  No updates to perform. All users are missing coordinates.");
      return;
    }

    // Perform updates
    console.log(`📝 Updating ${updates.length} diagnoses in database...`);
    let successCount = 0;
    let failureCount = 0;

    for (const update of updates) {
      try {
        await prisma.diagnosis.update({
          where: { id: update.id },
          data: {
            latitude: update.latitude,
            longitude: update.longitude,
            district: update.district,
          },
        });
        successCount++;
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed to update diagnosis ${update.id}:`, error);
      }

      if (successCount % 50 === 0) {
        console.log(
          `Updated ${successCount}/${updates.length} diagnoses... (${failureCount} failures)`,
        );
      }
    }

    console.log(
      `\n✅ Successfully updated ${successCount} diagnoses with coordinates and districts`,
    );

    if (failureCount > 0) {
      console.log(`⚠️  Failed to update ${failureCount} diagnoses`);
    }

    // Show final summary
    console.log("\n📊 Final Summary:");
    console.log(`  Total diagnoses processed: ${diagnoses.length}`);
    console.log(`  Successfully updated: ${successCount}`);
    console.log(`  Skipped (no user coords): ${skipCount}`);
    console.log(`  Failed: ${failureCount}`);
    if (diagnoses.length > 0) {
      console.log(
        `  Success rate: ${((successCount / diagnoses.length) * 100).toFixed(1)}%`,
      );
    }
  } catch (error) {
    console.error("❌ Update error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateDiagnosesWithUserCoords();
