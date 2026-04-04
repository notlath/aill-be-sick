import { PrismaClient } from "../lib/generated/prisma";

const prisma = new PrismaClient();
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

async function triggerSurveillanceCheck() {
  console.log(`\n🔍 Triggering Unified Surveillance Check via ${BACKEND_URL}...`);

  try {
    const res = await fetch(`${BACKEND_URL}/api/surveillance/cron`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`❌ Backend error: ${res.status}`);
      return;
    }

    const { anomalies, outbreaks, errors } = await res.json();

    if (errors && errors.length > 0) {
      console.warn(`⚠️  Partial failures detected:`);
      errors.forEach((e: string) => console.warn(`   - ${e}`));
    }

    if (!anomalies?.length && !outbreaks?.length) {
      console.log("✅ No new anomalies or outbreaks detected based on current data.");
      return;
    }

    if (anomalies?.length) {
      console.log(`\n🔥 ${anomalies.length} anomalous diagnoses found! Processing...`);
      for (const anomaly of anomalies) {
        if (!anomaly.reason) continue;
        const diagnosisId = Number(anomaly.id);
        const reasonCodes = anomaly.reason.split("|").filter(Boolean);

        const existing = await prisma.alert.findFirst({
          where: {
            type: "ANOMALY",
            diagnosisId,
          },
        });

        if (existing) {
          console.log(`⏭️  Skipping duplicate anomaly alert for diagnosis ${diagnosisId}`);
          continue;
        }

        const alert = await prisma.alert.create({
          data: {
            type: "ANOMALY",
            severity: mapSeverity(reasonCodes) as any,
            reasonCodes,
            message: buildMessage(anomaly.disease, reasonCodes),
            diagnosisId,
            metadata: {
              disease: anomaly.disease,
              confidence: anomaly.confidence,
              uncertainty: anomaly.uncertainty,
            },
          },
        });

        console.log(`🚀 ANOMALY ALERT CREATED: diagnosis ${diagnosisId} (ID: ${alert.id})`);
      }
    }

    if (outbreaks?.length) {
      console.log(`\n🔥 ${outbreaks.length} potential outbreak(s) found! Processing...`);
      for (const outbreak of outbreaks) {
        const { disease, district, severity, reasonCodes, message, metadata } = outbreak;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existing = await prisma.alert.findFirst({
          where: {
            type: "OUTBREAK",
            status: { in: ["NEW", "ACKNOWLEDGED"] },
            metadata: { path: ["disease"], equals: disease },
            AND: [
              { metadata: { path: ["district"], equals: district ?? "" } },
              { createdAt: { gte: oneDayAgo } },
            ],
          },
        });

        if (existing) {
          console.log(`⏭️  Skipping duplicate alert for ${disease} in ${district}`);
          continue;
        }

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
    }

    console.log("\n✨ Done. Check your Clinician Dashboard alerts!");
  } catch (err) {
    console.error("❌ Failed to trigger surveillance check:", err);
  } finally {
    await prisma.$disconnect();
  }
}

function mapSeverity(reasonCodes: string[]): string {
  if (reasonCodes.includes("GEOGRAPHIC:RARE") && reasonCodes.includes("COMBINED:MULTI")) return "CRITICAL";
  if (reasonCodes.includes("GEOGRAPHIC:RARE")) return "HIGH";
  if (reasonCodes.includes("COMBINED:MULTI") && reasonCodes.length >= 3) return "HIGH";
  if (reasonCodes.includes("CLUSTER:DENSE") || reasonCodes.includes("OUTBREAK:VOL_SPIKE")) return "MEDIUM";
  return "LOW";
}

function buildMessage(disease: string, reasonCodes: string[]): string {
  const formatter = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
  return `Surveillance flagged ${disease} case with: ${formatter.format(reasonCodes)}`;
}

triggerSurveillanceCheck();
