/*
  Warnings:

  - Made the column `uncertainty` on table `Diagnosis` required. This step will fail if there are existing NULL values in that column.
  - Made the column `uncertainty` on table `TempDiagnosis` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Diagnosis" ALTER COLUMN "uncertainty" SET NOT NULL;

-- AlterTable
ALTER TABLE "TempDiagnosis" ALTER COLUMN "uncertainty" SET NOT NULL;
