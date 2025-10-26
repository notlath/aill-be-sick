-- CreateTable
CREATE TABLE "TempDiagnosis" (
    "id" SERIAL NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "uncertainty" DOUBLE PRECISION NOT NULL,
    "disease" "Disease" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" INTEGER NOT NULL,

    CONSTRAINT "TempDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TempDiagnosis_messageId_key" ON "TempDiagnosis"("messageId");

-- AddForeignKey
ALTER TABLE "TempDiagnosis" ADD CONSTRAINT "TempDiagnosis_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
