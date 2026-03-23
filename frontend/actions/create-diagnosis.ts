"use server";

import prisma from "@/prisma/prisma";
import { CreateDiagnosisSchema } from "@/schemas/CreateDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import { getBackendUrl } from "@/utils/backend-url";
import { mapReasonCodesToSeverity } from "@/utils/alert-severity";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";

const BACKEND_URL = getBackendUrl();

/** Determine the AlertType from the list of reason codes. */
function resolveAlertType(
  reasonCodes: string[],
): "ANOMALY" | "LOW_CONFIDENCE" | "HIGH_UNCERTAINTY" {
  if (
    reasonCodes.length === 1 &&
    reasonCodes[0] === "CONFIDENCE:LOW"
  )
    return "LOW_CONFIDENCE";
  if (
    reasonCodes.length === 1 &&
    reasonCodes[0] === "UNCERTAINTY:HIGH"
  )
    return "HIGH_UNCERTAINTY";
  return "ANOMALY";
}

/** Build a human-readable alert message for clinicians. */
function buildAlertMessage(
  disease: string,
  reasonCodes: string[],
  severity: string,
): string {
  const codeLabels: Record<string, string> = {
    "GEOGRAPHIC:RARE": "an occurrence in an unusual location",
    "TEMPORAL:RARE": "a presentation during an off-season period",
    "CLUSTER:SPATIAL": "a sudden geographic group of similar cases",
    "CONFIDENCE:LOW": "low predictive confidence from the AI model",
    "UNCERTAINTY:HIGH": "high statistical uncertainty from the AI model",
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

export const createDiagnosis = actionClient
  .inputSchema(CreateDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const {
      confidence,
      uncertainty,
      modelUsed,
      disease,
      chatId,
      symptoms,
      messageId,
      cdss,
      temperature,
      temperatureUnit,
    } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);

      return { error: `Error fetching user: ${error}` };
    }

    if (error) {
      console.error(`Error fetching user: ${error}`);

      return { error: `Error fetching user: ${error}` };
    }

    try {
      const explanation = await prisma.explanation.findUnique({
        where: { messageId },
      });

      const diagnosis = await prisma.diagnosis.create({
        data: {
          confidence,
          uncertainty,
          modelUsed,
          disease,
          chatId,
          symptoms,
          cdss: (cdss as any) ?? undefined,
          userId: dbUser.id,
          latitude: dbUser.latitude ?? null,
          longitude: dbUser.longitude ?? null,
          city: dbUser.city,
          province: dbUser.province,
          region: dbUser.region,
          barangay: dbUser.barangay,
          district: dbUser.district,
          // Store temperature data for future analytics
          temperature: temperature ?? null,
          temperatureUnit: temperatureUnit ?? null,
          ...(explanation
            ? {
                explanation: {
                  connect: {
                    id: explanation.id,
                  },
                },
              }
            : {}),
        },
      });

      await prisma.chat.update({
        where: { chatId },
        data: { hasDiagnosis: true },
      });

      await prisma.tempDiagnosis.deleteMany({
        where: { chatId },
      });

      revalidateTag(`messages-${chatId}`, { expire: 0 });
      revalidateTag("diagnosis", { expire: 0 });
      revalidateTag(`diagnosis-${chatId}`, { expire: 0 });
      revalidateTag("chat", { expire: 0 });
      revalidateTag(`chat-${chatId}`, { expire: 0 });
      revalidatePath(`/diagnosis/${chatId}`, "page");
      revalidatePath("/history", "page");

      // Run anomaly and outbreak checks in the background — non-blocking.
      checkAndCreateAlert({
        diagnosisId: diagnosis.id,
        disease,
        confidence,
        uncertainty,
        city: dbUser.city,
        province: dbUser.province,
        region: dbUser.region,
        barangay: dbUser.barangay,
        district: dbUser.district,
        latitude: dbUser.latitude ?? null,
        longitude: dbUser.longitude ?? null,
        patientAge: dbUser.age ?? undefined,
        patientGender: dbUser.gender ?? undefined,
      }).catch((err) =>
        console.error(`Anomaly alert failed for diagnosis ${diagnosis.id}:`, err),
      );

      checkAndCreateOutbreakAlert({
        disease,
        district: dbUser.district,
      }).catch((err) =>
        console.error(`Outbreak alert failed for diagnosis ${diagnosis.id}:`, err),
      );

      return { success: "Successfully recorded diagnosis" };
    } catch (error) {
      console.error(`Error creating diagnosis: ${error}`);

      return { error: `Error creating diagnosis: ${error}` };
    }
  });

type AlertCheckParams = {
  diagnosisId: number;
  disease: string;
  confidence: number;
  uncertainty: number;
  city?: string | null;
  province?: string | null;
  region?: string | null;
  barangay?: string | null;
  district?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  patientAge?: number;
  patientGender?: string;
};

/**
 * Calls the Flask surveillance endpoint (full dataset, no filters) and checks
 * whether the newly created diagnosis was flagged as an anomaly. If so, it
 * persists an Alert record via Prisma directly (avoiding an extra server-action
 * round-trip since we're already in a server context).
 */
async function checkAndCreateAlert(params: AlertCheckParams): Promise<void> {
  const {
    diagnosisId,
    disease,
    confidence,
    uncertainty,
    city,
    province,
    region,
    barangay,
    district,
    latitude,
    longitude,
    patientAge,
    patientGender,
  } = params;

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/surveillance/outbreaks?contamination=0.05`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      console.warn(
        `Surveillance check skipped — backend responded ${res.status}`,
      );
      return;
    }

    const data = await res.json();
    const anomalies: { id: string | number; reason: string | null }[] =
      data.anomalies ?? [];

    // The surveillance service returns string UUIDs but our Prisma IDs are
    // integers. Match on both to be safe.
    const match = anomalies.find(
      (a) =>
        String(a.id) === String(diagnosisId) ||
        Number(a.id) === diagnosisId,
    );

    if (!match || !match.reason) return;

    const reasonCodes = match.reason.split("|").filter(Boolean);
    const severity = mapReasonCodesToSeverity(reasonCodes);
    const type = resolveAlertType(reasonCodes);
    const message = buildAlertMessage(disease, reasonCodes, severity);

    await prisma.alert.create({
      data: {
        type,
        severity,
        reasonCodes,
        message,
        diagnosisId,
        metadata: {
          disease,
          confidence,
          uncertainty,
          city: city ?? undefined,
          province: province ?? undefined,
          region: region ?? undefined,
          barangay: barangay ?? undefined,
          district: district ?? undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
          patientAge,
          patientGender,
        },
      },
    });

    console.log(
      `Alert created for diagnosis ${diagnosisId} — severity: ${severity}, reasons: ${reasonCodes.join(", ")}`,
    );
  } catch (err) {
    // Surface but don't re-throw; diagnosis must succeed regardless.
    console.error(`Anomaly check failed for diagnosis ${diagnosisId}:`, err);
  }
}

/**
 * Calls the Flask outbreak detection endpoint and creates OUTBREAK alerts
 * if any recent clusters or threshold breaches are detected. Includes
 * duplicate prevention to avoid spamming the same outbreak multiple times.
 */
async function checkAndCreateOutbreakAlert(params: {
  disease: string;
  district?: string | null;
}): Promise<void> {
  const { disease, district } = params;

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/surveillance/outbreaks/detect`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      console.warn(
        `Outbreak detection skipped — backend responded ${res.status}`,
      );
      return;
    }

    const { outbreaks } = (await res.json()) as { outbreaks: any[] };

    if (!outbreaks || outbreaks.length === 0) return;

    // Process each detected outbreak
    for (const outbreak of outbreaks) {
      const {
        disease: oDisease,
        district: oDistrict,
        severity,
        reasonCodes,
        message,
        metadata,
      } = outbreak;

      // Duplicate prevention: check for an existing NEW/ACKNOWLEDGED alert
      // for this same disease and district created in the last 24 hours.
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await prisma.alert.findFirst({
        where: {
          type: "OUTBREAK",
          status: { in: ["NEW", "ACKNOWLEDGED"] },
          metadata: {
            path: ["disease"],
            equals: oDisease,
          },
          AND: [
            {
              metadata: {
                path: ["district"],
                equals: oDistrict ?? "",
              },
            },
            {
              createdAt: { gte: oneDayAgo },
            },
          ],
        },
      });

      if (existing) {
        console.log(
          `Skipping duplicate outbreak alert for ${oDisease} in ${oDistrict}`,
        );
        continue;
      }

      // Create the outbreak alert
      await prisma.alert.create({
        data: {
          type: "OUTBREAK",
          severity: severity as any,
          reasonCodes,
          message,
          metadata: metadata as any,
        },
      });

      console.log(
        `OUTBREAK Alert created for ${oDisease} in ${oDistrict} — severity: ${severity}`,
      );
    }
  } catch (err) {
    console.error(`Outbreak detection failed:`, err);
  }
}

