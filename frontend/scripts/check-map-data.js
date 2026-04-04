const { PrismaClient } = require("../lib/generated/prisma");
const p = new PrismaClient();

(async () => {
  const totalPatients = await p.user.count({ where: { role: "PATIENT" } });
  const withAge = await p.user.count({ where: { role: "PATIENT", age: { not: null } } });
  const withGender = await p.user.count({ where: { role: "PATIENT", gender: { not: null } } });
  const withBoth = await p.user.count({ where: { role: "PATIENT", age: { not: null }, gender: { not: null } } });
  
  const verifiedDiagnoses = await p.diagnosis.count({ where: { status: "VERIFIED" } });
  const verifiedWithUser = await p.diagnosis.count({
    where: {
      status: "VERIFIED",
      user: { age: { not: null }, gender: { not: null } },
    },
  });
  
  console.log(`Patients: ${totalPatients}`);
  console.log(`  With age: ${withAge}`);
  console.log(`  With gender: ${withGender}`);
  console.log(`  With both: ${withBoth}`);
  console.log(`Verified diagnoses: ${verifiedDiagnoses}`);
  console.log(`Verified with valid user data: ${verifiedWithUser}`);
  
  await p.$disconnect();
})();
