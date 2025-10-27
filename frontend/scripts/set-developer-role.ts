// Run this script with: npx tsx scripts/set-developer-role.ts <email>
// Example: npx tsx scripts/set-developer-role.ts developer@example.com

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setDeveloperRole(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: "DEVELOPER" as any },
    });

    console.log(`Successfully updated user ${email} to DEVELOPER role`);
    console.log(updatedUser);
  } catch (error) {
    console.error("Error updating user role:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];

if (!email) {
  console.error("Please provide an email address");
  console.error("Usage: npx tsx scripts/set-developer-role.ts <email>");
  process.exit(1);
}

setDeveloperRole(email);
