import prisma from "@/prisma/prisma";

export async function hasActiveDeletionSchedule(userId: number): Promise<boolean> {
  try {
    const schedule = await prisma.deletionSchedule.findFirst({
      where: { userId, status: "SCHEDULED" },
    });
    return !!schedule;
  } catch (error) {
    console.error("Error checking deletion schedule:", error);
    return true;
  }
}
