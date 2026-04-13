import {
  getClinicalVerificationProtocol,
  normalizeDiseaseValue,
} from "@/constants/clinical-verification-protocols";
import type {
  ClinicalVerificationPayload,
  ClinicalVerificationResult,
  ClinicalVerificationStatus,
  DiseaseVerificationProtocol,
} from "@/types/clinical-verification";

export const scoreClinicalVerification = (
  protocol: DiseaseVerificationProtocol,
  selectedSymptomIds: string[],
): ClinicalVerificationResult => {
  const selected = new Set(selectedSymptomIds);
  const coreIds = protocol.coreSymptoms.map((symptom) => symptom.id);
  const contradictionIds = protocol.contradictionSymptoms.map(
    (symptom) => symptom.id,
  );
  const matchedSymptomIds = [
    ...protocol.coreSymptoms,
    ...protocol.supportingSymptoms,
  ]
    .filter((symptom) => selected.has(symptom.id))
    .map((symptom) => symptom.id);
  const missingCoreSymptomIds = coreIds.filter((id) => !selected.has(id));
  const contradictionSymptomIds = contradictionIds.filter((id) =>
    selected.has(id),
  );

  const matchedCount = matchedSymptomIds.length;
  const coreMatchedCount = coreIds.length - missingCoreSymptomIds.length;
  const contradictionCount = contradictionSymptomIds.length;

  let status: ClinicalVerificationStatus = "UNCONFIRMED";

  const meetsCount = matchedCount >= protocol.minRequiredCount;
  const meetsCore = coreMatchedCount >= protocol.minCoreCount;
  const nearCount = matchedCount === protocol.minRequiredCount - 1;
  const nearCore = coreMatchedCount >= protocol.minCoreCount;

  if (meetsCount && meetsCore && contradictionCount === 0) {
    status = "CONFIRMED";
  } else if (
    (meetsCount && meetsCore && contradictionCount > 0) ||
    (nearCount && nearCore)
  ) {
    status = "BORDERLINE";
  }

  return {
    status,
    protocolVersion: protocol.protocolVersion,
    selectedSymptomIds: [...selected],
    matchedSymptomIds,
    missingCoreSymptomIds,
    contradictionSymptomIds,
    matchedCount,
    minRequiredCount: protocol.minRequiredCount,
    coreMatchedCount,
    minCoreCount: protocol.minCoreCount,
    contradictionCount,
    submittedAt: new Date().toISOString(),
  };
};

export const scoreClinicalVerificationForDisease = (
  disease: string,
  selectedSymptomIds: string[],
): ClinicalVerificationResult | null => {
  const protocol = getClinicalVerificationProtocol(disease);
  return protocol ? scoreClinicalVerification(protocol, selectedSymptomIds) : null;
};

export const getClinicalVerificationStatusMeta = (
  status: string | null | undefined,
) => {
  switch (status) {
    case "CONFIRMED":
      return {
        label: "Confirmed",
        badgeClass: "badge-success",
        description:
          "The checked symptoms meet the protocol threshold for this suggested condition.",
      };
    case "BORDERLINE":
      return {
        label: "Borderline",
        badgeClass: "badge-warning",
        description:
          "Some symptoms support the suggestion, but the clinical pattern is mixed or incomplete.",
      };
    case "UNCONFIRMED":
      return {
        label: "Unconfirmed",
        badgeClass: "badge-error",
        description:
          "The checked symptoms do not meet the protocol threshold for this suggested condition.",
      };
    default:
      return {
        label: "Not yet verified",
        badgeClass: "badge-ghost",
        description:
          "This result has not yet been checked against the disease symptom protocol.",
      };
  }
};

export const isClinicalVerificationPayload = (
  value: unknown,
): value is ClinicalVerificationPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.protocolVersion === "string" &&
    Array.isArray(candidate.selectedSymptomIds) &&
    Array.isArray(candidate.matchedSymptomIds) &&
    Array.isArray(candidate.missingCoreSymptomIds) &&
    Array.isArray(candidate.contradictionSymptomIds) &&
    typeof candidate.matchedCount === "number" &&
    typeof candidate.minRequiredCount === "number" &&
    typeof candidate.coreMatchedCount === "number" &&
    typeof candidate.minCoreCount === "number" &&
    typeof candidate.contradictionCount === "number" &&
    typeof candidate.submittedAt === "string"
  );
};

export const normalizeClinicalVerificationRecord = (
  disease: string,
  status: string | null | undefined,
  payload: unknown,
) => {
  const normalizedDisease = normalizeDiseaseValue(disease);
  if (!normalizedDisease || !status || !isClinicalVerificationPayload(payload)) {
    return null;
  }

  const normalizedStatus = status.toUpperCase();
  if (
    normalizedStatus !== "CONFIRMED" &&
    normalizedStatus !== "BORDERLINE" &&
    normalizedStatus !== "UNCONFIRMED"
  ) {
    return null;
  }

  return {
    disease: normalizedDisease,
    status: normalizedStatus as ClinicalVerificationStatus,
    payload,
  };
};

export const getSymptomIdsFromQuestionIds = (
  diseaseValue: string,
  questionIds: string[],
): string[] => {
  const protocol = getClinicalVerificationProtocol(diseaseValue);
  if (!protocol || !Array.isArray(questionIds) || questionIds.length === 0) {
    return [];
  }

  const allSymptoms = [
    ...protocol.coreSymptoms,
    ...protocol.supportingSymptoms,
    ...protocol.contradictionSymptoms,
  ];

  const questionIdMap = new Map<string, string>();
  allSymptoms.forEach((s) => {
    questionIdMap.set(s.questionId, s.id);
  });

  return questionIds
    .map((qid) => questionIdMap.get(qid))
    .filter((id): id is string => Boolean(id));
};
