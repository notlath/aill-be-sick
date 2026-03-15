/*
  Update existing diagnoses with barangays from their user data.
  Run: bun scripts/update-diagnosis-baranggays.js
*/

const { PrismaClient } = require("../../lib/generated/prisma");

const prisma = new PrismaClient();

async function update() {
  try {
    console.log("Updating diagnoses with barangays...");

    const diagnosesWithoutBarangay = await prisma.diagnosis.findMany({
      where: {
        barangay: null,
      },
      include: {
        user: true,
      },
    });

    console.log(`Found ${diagnosesWithoutBarangay.length} diagnoses without barangay.`);

    let updated = 0;

    for (const diagnosis of diagnosesWithoutBarangay) {
      if (diagnosis.user?.barangay) {
        await prisma.diagnosis.update({
          where: { id: diagnosis.id },
          data: { barangay: diagnosis.user.barangay },
        });
        updated++;
      }

      if (updated % 50 === 0) {
        console.log(`Updated ${updated} diagnoses...`);
      }
    }

    console.log(`\nDone! Updated ${updated} diagnoses with barangays.`);
  } catch (e) {
    console.error("Update error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

update();
