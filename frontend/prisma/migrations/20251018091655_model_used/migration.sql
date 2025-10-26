/*
  Warnings:

  - Added the required column `modelUsed` to the `TempDiagnosis` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TempDiagnosis" ADD COLUMN     "modelUsed" "Model" NOT NULL;
