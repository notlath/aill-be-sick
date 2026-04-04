const { PrismaClient } = require("../lib/generated/prisma");
const p = new PrismaClient();

(async () => {
  console.log("Fixing patient ages with raw SQL...");
  
  const before = await p.user.count({ where: { role: "PATIENT", age: null } });
  console.log(`Patients with null age: ${before}`);
  
  await p.$executeRaw`
    UPDATE "User"
    SET age = EXTRACT(YEAR FROM AGE(birthday))::INTEGER
    WHERE role = 'PATIENT'
      AND birthday IS NOT NULL
      AND age IS NULL;
  `;
  
  const after = await p.user.count({ where: { role: "PATIENT", age: null } });
  console.log(`Patients still with null age: ${after}`);
  console.log(`Fixed: ${before - after} patients.`);
  
  await p.$disconnect();
})();
