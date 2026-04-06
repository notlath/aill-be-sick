import { PrismaClient } from "@prisma/client";
import { calculateAge } from "../utils/lib";

const prisma = new PrismaClient();

async function updateUserAge(userId: number) {
  try {
    // Get the user's birthday
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, birthday: true, age: true }
    });

    if (!user) {
      console.log(`User ${userId} not found`);
      return;
    }

    if (!user.birthday) {
      console.log(`User ${userId} has no birthday`);
      return;
    }

    if (user.age !== null) {
      console.log(`User ${userId} already has age: ${user.age}`);
      return;
    }

    // Calculate age
    const age = calculateAge(user.birthday.toISOString().split('T')[0]);

    // Update the user
    await prisma.user.update({
      where: { id: userId },
      data: { age }
    });

    console.log(`Updated user ${userId}: age set to ${age}`);
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
  }
}

// Usage: updateUserAge(USER_ID_HERE)
updateUserAge(123); // Replace 123 with the actual user ID