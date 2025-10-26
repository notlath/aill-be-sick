/*
  Warnings:

  - You are about to drop the column `tempDiagnosisId` on the `Explanation` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."Explanation_tempDiagnosisId_key";

-- AlterTable
ALTER TABLE "Explanation" DROP COLUMN "tempDiagnosisId";
