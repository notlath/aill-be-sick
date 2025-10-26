/*
  Warnings:

  - The values [DENGUE,PNEUMONIA,TYPHOID,IMPETIGO] on the enum `Disease` will be removed. If these variants are still used in the database, this will fail.
  - The values [BIOCLINICAL_MODERNBERT,ROBERTA_TAGALOG] on the enum `Model` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Disease_new" AS ENUM ('Dengue', 'Pneumonia', 'Typhoid', 'Impetigo');
ALTER TABLE "TempDiagnosis" ALTER COLUMN "disease" TYPE "Disease_new" USING ("disease"::text::"Disease_new");
ALTER TABLE "Diagnosis" ALTER COLUMN "disease" TYPE "Disease_new" USING ("disease"::text::"Disease_new");
ALTER TYPE "Disease" RENAME TO "Disease_old";
ALTER TYPE "Disease_new" RENAME TO "Disease";
DROP TYPE "public"."Disease_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Model_new" AS ENUM ('BioClinical-ModernBERT', 'RoBERTa-Tagalog');
ALTER TABLE "TempDiagnosis" ALTER COLUMN "modelUsed" TYPE "Model_new" USING ("modelUsed"::text::"Model_new");
ALTER TABLE "Diagnosis" ALTER COLUMN "modelUsed" TYPE "Model_new" USING ("modelUsed"::text::"Model_new");
ALTER TYPE "Model" RENAME TO "Model_old";
ALTER TYPE "Model_new" RENAME TO "Model";
DROP TYPE "public"."Model_old";
COMMIT;
