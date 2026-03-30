-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_ADMIN_APPROVAL', 'ACTIVE', 'REJECTED');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "approvedBy" INTEGER,
ADD COLUMN "approvalNotes" TEXT,
ADD COLUMN "rejectedAt" TIMESTAMP(3);
