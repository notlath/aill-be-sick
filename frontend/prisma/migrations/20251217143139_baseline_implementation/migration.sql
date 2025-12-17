-- AlterTable
ALTER TABLE "Diagnosis" ALTER COLUMN "uncertainty" DROP NOT NULL;

-- AlterTable
ALTER TABLE "TempDiagnosis" ALTER COLUMN "uncertainty" DROP NOT NULL;
