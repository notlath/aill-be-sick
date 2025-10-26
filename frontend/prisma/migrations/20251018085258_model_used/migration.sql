/*
  Warnings:

  - Added the required column `modelUsed` to the `Diagnosis` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Model" AS ENUM ('BIOCLINICAL_MODERNBERT', 'ROBERTA_TAGALOG');

-- AlterTable
ALTER TABLE "Diagnosis" ADD COLUMN     "modelUsed" "Model" NOT NULL;
