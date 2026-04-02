import prisma from "@/prisma/prisma";

async function batchApproveDiagnoses() {
  try {
    // Get 500 pending diagnoses
    const pendingDiagnoses = await prisma.diagnosis.findMany({
      where: {
        status: "PENDING",
      },
      take: 500,
      select: {
        id: true,
      },
    });

    if (pendingDiagnoses.length === 0) {
      console.log("No pending diagnoses found");
      return;
    }

    console.log(`Found ${pendingDiagnoses.length} pending diagnoses`);

    // Update them to VERIFIED
    const result = await prisma.diagnosis.updateMany({
      where: {
        id: {
          in: pendingDiagnoses.map((d) => d.id),
        },
      },
      data: {
        status: "VERIFIED",
        verifiedAt: new Date(),
      },
    });

    console.log(`Successfully approved ${result.count} diagnoses`);
  } catch (error) {
    console.error("Error batch approving diagnoses:", error);
  } finally {
    await prisma.$disconnect();
  }
}

batchApproveDiagnoses();
