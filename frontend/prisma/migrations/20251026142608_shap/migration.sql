-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'URGENT_WARNING';
ALTER TYPE "MessageType" ADD VALUE 'ERROR';

-- CreateTable
CREATE TABLE "Explanation" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosisId" INTEGER,
    "tempDiagnosisId" INTEGER,
    "tokens" TEXT[],
    "importances" DOUBLE PRECISION[],

    CONSTRAINT "Explanation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Explanation_diagnosisId_key" ON "Explanation"("diagnosisId");

-- CreateIndex
CREATE UNIQUE INDEX "Explanation_tempDiagnosisId_key" ON "Explanation"("tempDiagnosisId");

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_tempDiagnosisId_fkey" FOREIGN KEY ("tempDiagnosisId") REFERENCES "TempDiagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
