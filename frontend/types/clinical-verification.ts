import type { DiseaseValue } from "@/constants/diseases";

export type ClinicalVerificationStatus =
  | "CONFIRMED"
  | "BORDERLINE"
  | "UNCONFIRMED";

export type VerificationSymptomRole =
  | "core"
  | "supporting"
  | "contradiction";

export interface DiseaseVerificationSymptom {
  id: string;
  questionId: string;
  role: VerificationSymptomRole;
  labels: {
    en: string;
    tl: string;
  };
}

export interface DiseaseVerificationProtocol {
  disease: DiseaseValue;
  diseaseName: string;
  minRequiredCount: number;
  minCoreCount: number;
  protocolVersion: string;
  sources: string[];
  coreSymptoms: DiseaseVerificationSymptom[];
  supportingSymptoms: DiseaseVerificationSymptom[];
  contradictionSymptoms: DiseaseVerificationSymptom[];
}

export interface ClinicalVerificationPayload {
  protocolVersion: string;
  selectedSymptomIds: string[];
  matchedSymptomIds: string[];
  missingCoreSymptomIds: string[];
  contradictionSymptomIds: string[];
  matchedCount: number;
  minRequiredCount: number;
  coreMatchedCount: number;
  minCoreCount: number;
  contradictionCount: number;
  submittedAt: string;
}

export interface ClinicalVerificationResult
  extends ClinicalVerificationPayload {
  status: ClinicalVerificationStatus;
}
