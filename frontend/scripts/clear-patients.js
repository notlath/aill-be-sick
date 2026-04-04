const { PrismaClient } = require("../lib/generated/prisma");
const p = new PrismaClient();

(async () => {
  const del = await p.user.deleteMany({ where: { role: "PATIENT" } });
  console.log("Deleted patients:", del.count);
  await p.$disconnect();
})();
