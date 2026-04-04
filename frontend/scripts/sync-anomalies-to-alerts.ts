import { PrismaClient } from "../lib/generated/prisma";
import { mapReasonCodesToSeverity } from "../utils/alert-severity";

const prisma = new PrismaClient();

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";
const CONTAMINATION = 0.05;

interface SurveillanceAnomaly {
  id: number;
  disease: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  city: string | null;
  province: string | null;
  barangay: string | null;
  region: string | null;
  district: string | null;
  confidence: number;
  uncertainty: number;
  userId: number;
  is_anomaly: boolean;
  anomaly_score: number;
  reason: string | null;
  patientAge: number | null;
  patientGender: string | null;
}

interface OutbreakFullResult {
  anomalies: SurveillanceAnomaly[];
}

function buildAlertMessage(
  disease: string,
  reasonCodes: string[],
  severity: string,
): string {
  const codeLabels: Record<string, string> = {
    "GEOGRAPHIC:RARE": "an occurrence in an unusual location",
    "TEMPORAL:RARE": "a presentation during an off-season period",
    "COMBINED:MULTI": "multiple overlapping anomalies",
    "AGE:RARE": "a patient age outside the typical demographic range",
    "GENDER:RARE": "a patient demographic that is uncommon for this disease",
  };

  const validLabels = reasonCodes
    .filter((c) => c !== "COMBINED:MULTI")
    .map((c) => codeLabels[c] ?? c);

  if (validLabels.length === 0 && reasonCodes.includes("COMBINED:MULTI")) {
    validLabels.push(codeLabels["COMBINED:MULTI"]);
  }

  const formatter = new Intl.ListFormat("en", {
    style: "long",
    type: "conjunction",
  });
  const formattedLabels = formatter.format(validLabels);

  const severityText = severity.toLowerCase();
  return `A ${severityText}-priority ${disease} diagnosis requires attention. The case was flagged due to ${formattedLabels}.`;
}

async function fetchAnomalies(): Promise<SurveillanceAnomaly[]> {
  const url = `${BACKEND_URL}/api/surveillance/outbreaks?contamination=${CONTAMINATION}`;
  console.log(`Fetching anomalies from: ${url}`);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Failed to fetch anomalies. Status: ${res.status}. Body: ${errorBody}`);
  }

  const data: OutbreakFullResult = await res.json();
  console.log(`Fetched ${data.anomalies.length} anomalies`);

  // Enrich anomalies with patient age and gender from User model
  const enrichedAnomalies = await Promise.all(
    data.anomalies.map(async (anomaly) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: anomaly.userId },
          select: { age: true, gender: true },
        });
        return {
          ...anomaly,
          patientAge: user?.age ?? null,
          patientGender: user?.gender ?? null,
        };
      } catch (error) {
        console.error(`Error fetching user data for anomaly ${anomaly.id}:`, error);
        return {
          ...anomaly,
          patientAge: null,
          patientGender: null,
        };
      }
    }),
  );

  return enrichedAnomalies;
}

async function syncAnomaliesToAlerts() {
  console.log("Starting anomaly to alert sync...\n");

  const anomalies = await fetchAnomalies();

  if (anomalies.length === 0) {
    console.log("No anomalies found. Exiting.");
    return;
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const anomaly of anomalies) {
    if (!anomaly.reason) {
      console.log(`Skipping anomaly ${anomaly.id} - no reason codes`);
      skipped++;
      continue;
    }

    const existingAlert = await prisma.alert.findFirst({
      where: { diagnosisId: anomaly.id },
    });

    if (existingAlert) {
      console.log(`Skipping anomaly ${anomaly.id} - alert already exists`);
      skipped++;
      continue;
    }

    const reasonCodes = anomaly.reason.split("|").filter(Boolean);
    const severity = mapReasonCodesToSeverity(reasonCodes);
    const message = buildAlertMessage(anomaly.disease, reasonCodes, severity);

    try {
      await prisma.alert.create({
        data: {
          type: "ANOMALY",
          severity,
          diagnosisId: anomaly.id,
          reasonCodes,
          message,
          metadata: {
            disease: anomaly.disease,
            city: anomaly.city,
            province: anomaly.province,
            region: anomaly.region,
            barangay: anomaly.barangay,
            district: anomaly.district,
            latitude: anomaly.latitude,
            longitude: anomaly.longitude,
            patientAge: anomaly.patientAge,
            patientGender: anomaly.patientGender,
            anomalyScore: anomaly.anomaly_score,
            confidence: anomaly.confidence,
            uncertainty: anomaly.uncertainty,
          },
        },
      });
      console.log(`Created alert for anomaly ${anomaly.id} (${anomaly.disease}) - type: ANOMALY, severity: ${severity}`);
      created++;
    } catch (error) {
      console.error(`Error creating alert for anomaly ${anomaly.id}:`, error);
      errors++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
}

syncAnomaliesToAlerts()
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
