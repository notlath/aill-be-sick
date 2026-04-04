"use server";

import prisma from "@/prisma/prisma";
import { AutoRecordDiagnosisSchema } from "@/schemas/AutoRecordDiagnosisSchema";
import { getCurrentDbUser } from "@/utils/user";
import { getBackendUrl } from "@/utils/backend-url";
import { mapReasonCodesToSeverity } from "@/utils/alert-severity";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";
import { DiagnosisStatus } from "@/lib/generated/prisma";

const BACKEND_URL = getBackendUrl();

/**
 * Automatically promotes a TempDiagnosis to a permanent Diagnosis record once
 * a SHAP explanation has been generated. All diagnoses are auto-recorded
 * regardless of confidence or uncertainty levels, ensuring no diagnosis is
 * left in a limbo state.
 *
 * GPS coordinates are optional — profile-based location fields (city, province,
 * region, barangay, district) are always sourced from the authenticated user.
 * The full alert pipeline (anomaly + outbreak) runs identically to the manual
 * recording path.
 *
 * For inconclusive diagnoses (isInconclusive=true), the diagnosis is recorded
 * with status INCONCLUSIVE and anomaly/outbreak checks are skipped. These cases
 * represent diagnoses where the AI model could not reach a confident prediction.
 */

export const autoRecordDiagnosis = actionClient
  .inputSchema(AutoRecordDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { messageId, chatId, isInconclusive } = parsedInput;

    const { success: dbUser, error } = await getCurrentDbUser();
    if (!dbUser) {
      console.error(`[autoRecordDiagnosis] Error fetching user: ${error}`);
      return { error: `Error fetching user: ${error}` };
    }

    try {
      // Guard: if the chat already has a recorded diagnosis, skip silently.
      const chat = await prisma.chat.findUnique({
        where: { chatId },
        select: { hasDiagnosis: true },
      });
      if (chat?.hasDiagnosis) {
        return { success: "Diagnosis already recorded." };
      }

      // Look up the TempDiagnosis linked to this DIAGNOSIS message.
      const tempDiagnosis = await prisma.tempDiagnosis.findFirst({
        where: { chatId },
        orderBy: { id: "desc" },
      });

      if (!tempDiagnosis) {
        console.warn(
          `[autoRecordDiagnosis] No TempDiagnosis found for chat ${chatId}`,
        );
        return { error: "No pending diagnosis found to record." };
      }

      // Link the already-generated Explanation (if any) to the new Diagnosis.
      const explanation = await prisma.explanation.findUnique({
        where: { messageId },
      });

      const diagnosis = await prisma.diagnosis.create({
        data: {
          confidence: tempDiagnosis.confidence,
          uncertainty: tempDiagnosis.uncertainty,
          modelUsed: tempDiagnosis.modelUsed,
          disease: tempDiagnosis.disease,
          chatId,
          symptoms: tempDiagnosis.symptoms,
          cdss: (tempDiagnosis as any).cdss ?? undefined,
          userId: dbUser.id,
          latitude: dbUser.latitude ?? null,
          longitude: dbUser.longitude ?? null,
          city: dbUser.city,
          province: dbUser.province,
          region: dbUser.region,
          barangay: dbUser.barangay,
          district: dbUser.district,
          // Inconclusive diagnoses get INCONCLUSIVE status; others remain PENDING
          status: isInconclusive
            ? DiagnosisStatus.INCONCLUSIVE
            : DiagnosisStatus.PENDING,
          ...(explanation
            ? { explanation: { connect: { id: explanation.id } } }
            : {}),
        },
      });

      await prisma.chat.update({
        where: { chatId },
        data: { hasDiagnosis: true },
      });

      await prisma.tempDiagnosis.deleteMany({ where: { chatId } });

      revalidateTag(`messages-${chatId}`, { expire: 0 });
      revalidateTag("diagnosis", { expire: 0 });
      revalidateTag(`diagnosis-${chatId}`, { expire: 0 });
      revalidateTag("chat", { expire: 0 });
      revalidateTag(`chat-${chatId}`, { expire: 0 });
      revalidatePath(`/diagnosis/${chatId}`, "page");
      revalidatePath("/history", "page");

      console.log(
        `[autoRecordDiagnosis] Recorded diagnosis ${diagnosis.id} for chat ${chatId}${isInconclusive ? " (inconclusive)" : ""}`,
      );

      // Skip anomaly and outbreak checks for inconclusive diagnoses.
      // These cases don't have confident predictions to flag as anomalies.
      if (!isInconclusive) {
        // Run anomaly and outbreak checks in the background — non-blocking.
        checkAndCreateAlert({
          diagnosisId: diagnosis.id,
          disease: String(tempDiagnosis.disease),
          confidence: tempDiagnosis.confidence,
          uncertainty: tempDiagnosis.uncertainty,
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
          console.error(
            `[autoRecordDiagnosis] Anomaly alert failed for diagnosis ${diagnosis.id}:`,
            err,
          ),
        );

        checkAndCreateOutbreakAlert({
          disease: String(tempDiagnosis.disease),
          district: dbUser.district,
        }).catch((err) =>
          console.error(
            `[autoRecordDiagnosis] Outbreak alert failed for diagnosis ${diagnosis.id}:`,
            err,
          ),
        );
      }

      return {
        success: isInconclusive
          ? "Inconclusive diagnosis recorded."
          : "Diagnosis automatically recorded.",
      };
    } catch (error) {
      console.error(`[autoRecordDiagnosis] Error: ${error}`);
      return { error: `Error auto-recording diagnosis: ${error}` };
    }
  });

// ── Alert helpers (mirrors create-diagnosis.ts) ────────────────────────────

function resolveAlertType(
  reasonCodes: string[],
): "ANOMALY" | "LOW_CONFIDENCE" | "HIGH_UNCERTAINTY" {
  if (reasonCodes.length === 1 && reasonCodes[0] === "CONFIDENCE:LOW")
    return "LOW_CONFIDENCE";
  if (reasonCodes.length === 1 && reasonCodes[0] === "UNCERTAINTY:HIGH")
    return "HIGH_UNCERTAINTY";
  return "ANOMALY";
}

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
  const reasons =
    validLabels.length > 0
      ? formatter.format(validLabels)
      : "unrecognized anomalies";
  return `A ${severity.toLowerCase()}-priority ${disease} diagnosis requires attention. The case was flagged due to ${reasons}.`;
}

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
        `[autoRecordDiagnosis] Surveillance check skipped — backend responded ${res.status}`,
      );
      return;
    }

    const data = await res.json();
    const anomalies: { id: string | number; reason: string | null }[] =
      data.anomalies ?? [];

    const match = anomalies.find(
      (a) =>
        String(a.id) === String(diagnosisId) || Number(a.id) === diagnosisId,
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
      `[autoRecordDiagnosis] Alert created for diagnosis ${diagnosisId} — severity: ${severity}`,
    );
  } catch (err) {
    console.error(
      `[autoRecordDiagnosis] Anomaly check failed for diagnosis ${diagnosisId}:`,
      err,
    );
  }
}

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
        `[autoRecordDiagnosis] Outbreak detection skipped — backend responded ${res.status}`,
      );
      return;
    }

    const { outbreaks } = (await res.json()) as { outbreaks: any[] };
    if (!outbreaks || outbreaks.length === 0) return;

    for (const outbreak of outbreaks) {
      const {
        disease: oDisease,
        district: oDistrict,
        severity,
        reasonCodes,
        message,
        metadata,
      } = outbreak;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await prisma.alert.findFirst({
        where: {
          type: "OUTBREAK",
          status: { in: ["NEW", "ACKNOWLEDGED"] },
          metadata: { path: ["disease"], equals: oDisease },
          AND: [
            { metadata: { path: ["district"], equals: oDistrict ?? "" } },
            { createdAt: { gte: oneDayAgo } },
          ],
        },
      });

      if (existing) {
        console.log(
          `[autoRecordDiagnosis] Skipping duplicate outbreak alert for ${oDisease} in ${oDistrict}`,
        );
        continue;
      }

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
        `[autoRecordDiagnosis] OUTBREAK Alert created for ${oDisease} in ${oDistrict}`,
      );
    }
  } catch (err) {
    console.error(`[autoRecordDiagnosis] Outbreak detection failed:`, err);
  }
}
