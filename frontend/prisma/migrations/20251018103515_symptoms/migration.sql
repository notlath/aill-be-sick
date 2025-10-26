/*
  Warnings:

  - Added the required column `symptoms` to the `Diagnosis` table without a default value. This is not possible if the table is not empty.
  - Added the required column `symptoms` to the `TempDiagnosis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "symptoms" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TempDiagnosis" ADD COLUMN     "symptoms" TEXT NOT NULL;
