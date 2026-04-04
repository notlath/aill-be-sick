import prisma from "@/prisma/prisma";
import { getBackendUrl } from "@/utils/backend-url";
import { mapReasonCodesToSeverity } from "@/utils/alert-severity";

const BACKEND_URL = getBackendUrl();

// ── Types ──────────────────────────────────────────────────────────────────

export type AlertCheckParams = {
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

// ── Alert Message Builder ──────────────────────────────────────────────────

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
  const reasons =
    validLabels.length > 0
      ? formatter.format(validLabels)
      : "unrecognized anomalies";
  return `A ${severity.toLowerCase()}-priority ${disease} diagnosis requires attention. The case was flagged due to ${reasons}.`;
}

// ── Anomaly Alert ──────────────────────────────────────────────────────────

export async function checkAndCreateAlert(params: AlertCheckParams): Promise<void> {
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
        `[alert-pipeline] Surveillance check skipped — backend responded ${res.status}`,
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
    const message = buildAlertMessage(disease, reasonCodes, severity);

    await prisma.alert.create({
      data: {
        type: "ANOMALY",
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
      `[alert-pipeline] Alert created for diagnosis ${diagnosisId} — severity: ${severity}`,
    );
  } catch (err) {
    console.error(
      `[alert-pipeline] Anomaly check failed for diagnosis ${diagnosisId}:`,
      err,
    );
  }
}

// ── Outbreak Alert ─────────────────────────────────────────────────────────

export async function checkAndCreateOutbreakAlert(): Promise<void> {
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/surveillance/outbreaks/detect`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      console.warn(
        `[alert-pipeline] Outbreak detection skipped — backend responded ${res.status}`,
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
          `[alert-pipeline] Skipping duplicate outbreak alert for ${oDisease} in ${oDistrict}`,
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
        `[alert-pipeline] OUTBREAK Alert created for ${oDisease} in ${oDistrict}`,
      );
    }
  } catch (err) {
    console.error(`[alert-pipeline] Outbreak detection failed:`, err);
  }
}
