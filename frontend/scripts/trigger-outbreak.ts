import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

async function triggerOutbreakCheck() {
  console.log(`\n🔍 Triggering Outbreak Detection via ${BACKEND_URL}...`);

  try {
    const res = await fetch(`${BACKEND_URL}/api/surveillance/outbreaks/detect`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`❌ Backend error: ${res.status}`);
      return;
    }

    const { outbreaks } = (await res.json()) as { outbreaks: any[] };

    if (!outbreaks || outbreaks.length === 0) {
      console.log("✅ No new outbreaks detected based on current data.");
      return;
    }

    console.log(`\n🔥 ${outbreaks.length} potential outbreak(s) found! Processing...`);

    for (const outbreak of outbreaks) {
      const { disease, district, severity, reasonCodes, message, metadata } = outbreak;

      // Duplicate prevention (24h window)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await prisma.alert.findFirst({
        where: {
          type: "OUTBREAK",
          status: { in: ["NEW", "ACKNOWLEDGED"] },
          createdAt: { gte: oneDayAgo },
          // Nested JSON metadata check (simpler version for script)
          message: { contains: disease },
        },
      });

      if (existing) {
        console.log(`⏭️  Skipping duplicate alert for ${disease} in ${district}`);
        continue;
      }

      // Create the alert record
      const alert = await prisma.alert.create({
        data: {
          type: "OUTBREAK",
          severity: severity as any,
          reasonCodes,
          message,
          metadata: metadata as any,
        },
      });

      console.log(`🚀 ALERT CREATED: [${severity}] ${message} (ID: ${alert.id})`);
    }

    console.log("\n✨ Done. Check your Clinician Dashboard alerts!");
  } catch (err) {
    console.error("❌ Failed to trigger outbreak check:", err);
  } finally {
    await prisma.$disconnect();
  }
}

triggerOutbreakCheck();
