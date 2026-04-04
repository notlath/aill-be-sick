const { PrismaClient } = require("../lib/generated/prisma");
const p = new PrismaClient();

(async () => {
  const count = await p.user.count();
  console.log("Total users:", count);
  
  const max = await p.user.findFirst({ orderBy: { id: "desc" } });
  console.log("Max user ID:", max?.id);
  
  const preserved = [2, 111, 124, 127, 1486, 1487, 1491, 1496, 1497, 999999, 99999, 2967];
  const existing = await p.user.findMany({
    where: { id: { in: preserved } },
    select: { id: true, email: true, role: true }
  });
  console.log("Preserved users found:", existing);
  
  const roles = await p.user.groupBy({ by: ["role"], _count: { id: true } });
  console.log("Users by role:", roles);
  
  await p.$disconnect();
})();
