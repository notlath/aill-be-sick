-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable: Add status field to Diagnosis model
ALTER TABLE "Diagnosis"
ADD COLUMN "status" "DiagnosisStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "verifiedAt" TIMESTAMP(3),
ADD COLUMN "verifiedBy" INTEGER,
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "rejectedBy" INTEGER;

-- Backward compatibility: Migrate existing diagnoses to VERIFIED
-- All existing diagnoses are considered verified since they were already in the system
UPDATE "Diagnosis" SET "status" = 'VERIFIED' WHERE "status" = 'PENDING';

-- Add foreign key constraint for verifiedBy (references User)
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_verifiedBy_fkey" 
  FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL;

-- Add foreign key constraint for rejectedBy (references User)
ALTER TABLE "Diagnosis" ADD CONSTRAINT "Diagnosis_rejectedBy_fkey" 
  FOREIGN KEY ("rejectedBy") REFERENCES "User"("id") ON DELETE SET NULL;

-- Indexes for efficient querying
CREATE INDEX "idx_diagnosis_status" ON "Diagnosis"("status");
CREATE INDEX "idx_diagnosis_status_createdAt" ON "Diagnosis"("status", "createdAt");
