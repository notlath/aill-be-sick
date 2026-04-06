import { PrismaClient } from "@prisma/client";
import { calculateAge } from "../utils/lib";

const prisma = new PrismaClient();

async function backfillUserAges() {
  console.log("Starting age backfill for existing users...");

  // Get all users who have a birthday but no age set
  const usersToUpdate = await prisma.user.findMany({
    where: {
      birthday: {
        not: null,
      },
      age: null,
    },
    select: {
      id: true,
      birthday: true,
    },
  });

  console.log(`Found ${usersToUpdate.length} users to update`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const user of usersToUpdate) {
    try {
      if (!user.birthday) continue;

      const age = calculateAge(user.birthday.toISOString().split('T')[0]);

      await prisma.user.update({
        where: { id: user.id },
        data: { age },
      });

      updatedCount++;
      console.log(`Updated user ${user.id}: age = ${age}`);
    } catch (error) {
      console.error(`Error updating user ${user.id}:`, error);
      errorCount++;
    }
  }

  console.log(`Age backfill completed: ${updatedCount} updated, ${errorCount} errors`);
}

backfillUserAges()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });