-- Add persisted patient-led clinical verification metadata to both
-- temporary and permanent diagnosis records.

CREATE TYPE "ClinicalVerificationStatus" AS ENUM (
  'CONFIRMED',
  'BORDERLINE',
  'UNCONFIRMED'
);

ALTER TABLE "TempDiagnosis"
ADD COLUMN "clinicalVerification" JSONB,
ADD COLUMN "clinicalVerificationStatus" "ClinicalVerificationStatus";

ALTER TABLE "Diagnosis"
ADD COLUMN "clinicalVerification" JSONB,
ADD COLUMN "clinicalVerificationStatus" "ClinicalVerificationStatus";
