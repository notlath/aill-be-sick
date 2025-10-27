/*
  Warnings:

  - A unique constraint covering the columns `[messageId]` on the table `Explanation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Explanation" ADD COLUMN     "messageId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Explanation_messageId_key" ON "Explanation"("messageId");

-- AddForeignKey
ALTER TABLE "Explanation" ADD CONSTRAINT "Explanation_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
