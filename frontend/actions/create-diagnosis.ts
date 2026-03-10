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
    "GEOGRAPHIC:RARE": "unusual location",
    "TEMPORAL:RARE": "unusual timing",
    "CLUSTER:SPATIAL": "spatial cluster",
    "CONFIDENCE:LOW": "low model confidence",
    "UNCERTAINTY:HIGH": "high model uncertainty",
    "COMBINED:MULTI": "multiple contributing factors",
    "AGE:RARE": "unusual patient age",
    "GENDER:RARE": "unusual patient gender",
  };

  const labels = reasonCodes
    .filter((c) => c !== "COMBINED:MULTI")
    .map((c) => codeLabels[c] ?? c)
    .join(", ");

  return `${severity} anomaly detected for ${disease}: ${labels}.`;
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
      location,
      messageId,
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
          userId: dbUser.id,
          latitude: location.latitude,
          longitude: location.longitude,
          city: dbUser.city,
          province: dbUser.province,
          region: dbUser.region,
          barangay: dbUser.barangay,
          district: dbUser.district,
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

      // Run anomaly check in the background — non-blocking so diagnosis is
      // always saved even if the surveillance service is unavailable.
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
        latitude: location.latitude,
        longitude: location.longitude,
        patientAge: dbUser.age ?? undefined,
        patientGender: dbUser.gender ?? undefined,
      }).catch((err) =>
        console.error(`Alert creation failed for diagnosis ${diagnosis.id}:`, err),
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

