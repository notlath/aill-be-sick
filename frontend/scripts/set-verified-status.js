/*
  set-verified-status.js — Update diagnosis statuses.
  
  Sets all diagnoses to VERIFIED except the first 10 which stay PENDING.
  
  Run: node --env-file=.env.local scripts/set-verified-status.js
*/

const path = require("path");
const { PrismaClient } = require("../lib/generated/prisma");

const prisma = new PrismaClient();

async function main() {
  console.log("Updating diagnosis statuses...");
  
  const total = await prisma.diagnosis.count();
  console.log(`Total diagnoses: ${total}`);
  
  // Get first 10 to keep as PENDING
  const pending = await prisma.diagnosis.findMany({
    take: 10,
    orderBy: { id: "asc" },
    select: { id: true },
  });
  
  const pendingIds = pending.map(d => d.id);
  console.log(`Keeping ${pendingIds.length} diagnoses as PENDING: ${pendingIds.join(", ")}`);
  
  // Update all others to VERIFIED
  const { count: verifiedCount } = await prisma.diagnosis.updateMany({
    where: {
      id: { notIn: pendingIds },
      status: { not: "VERIFIED" },
    },
    data: {
      status: "VERIFIED",
      verifiedAt: new Date(),
    },
  });
  
  console.log(`Updated ${verifiedCount} diagnoses to VERIFIED.`);
  console.log("Done!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
