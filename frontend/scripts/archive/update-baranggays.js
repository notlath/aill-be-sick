/*
  Update existing users with barangays based on their city/municipality.
  Run: bun scripts/update-baranggays.js
*/

const { PrismaClient } = require("../../lib/generated/prisma");
const path = require("path");
const fs = require("fs");

const prisma = new PrismaClient();

const municipalities = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/locations/municipalities.json"), "utf-8")
);
const barangays = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../public/locations/barangays.json"), "utf-8")
);

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBarangayForCity(cityName) {
  if (!cityName) return null;

  const municipality = municipalities.find(
    (m) => m.name.toLowerCase() === cityName.toLowerCase()
  );

  if (!municipality) return null;

  const municipalityBarangays = barangays.filter(
    (b) => b.municipalityPsgc === municipality.psgc
  );

  if (municipalityBarangays.length === 0) return null;

  const barangay = randChoice(municipalityBarangays);
  return barangay.name;
}

async function update() {
  try {
    console.log("Updating existing users with barangays...");

    const usersWithoutBarangay = await prisma.user.findMany({
      where: {
        barangay: null,
        city: { not: null },
      },
    });

    console.log(`Found ${usersWithoutBarangay.length} users without barangay.`);

    let updated = 0;
    let skipped = 0;

    for (const user of usersWithoutBarangay) {
      const barangay = getBarangayForCity(user.city);

      if (barangay) {
        await prisma.user.update({
          where: { id: user.id },
          data: { barangay },
        });
        updated++;
      } else {
        skipped++;
      }

      if (updated % 50 === 0) {
        console.log(`Updated ${updated} users...`);
      }
    }

    console.log(`\nDone! Updated ${updated} users, skipped ${skipped} (no matching barangays found).`);
  } catch (e) {
    console.error("Update error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

update();
