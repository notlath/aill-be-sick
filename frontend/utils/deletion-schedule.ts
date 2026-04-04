import prisma from "@/prisma/prisma";

export async function getActiveDeletionSchedule(userId: number) {
  try {
    const schedule = await prisma.deletionSchedule.findFirst({
      where: { userId, status: "SCHEDULED" },
      include: {
        scheduledByUser: {
          select: { name: true, email: true },
        },
      },
    });

    if (!schedule) return null;

    return schedule;
  } catch (error) {
    console.error("Error fetching deletion schedule:", error);
    return null;
  }
}

export async function getPendingDeletionSchedules() {
  try {
    const schedules = await prisma.deletionSchedule.findMany({
      where: { status: "SCHEDULED" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        scheduledByUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { scheduledDeletionAt: "asc" },
    });

    return schedules;
  } catch (error) {
    console.error("Error fetching pending deletion schedules:", error);
    return [];
  }
}

export function canRestoreDeletion(
  currentUserRole: string,
  currentUserId: number,
  scheduledBy: number
): boolean {
  if (["ADMIN", "DEVELOPER"].includes(currentUserRole)) {
    return true;
  }
  return false;
}

export function formatGracePeriodRemaining(scheduledDeletionAt: Date): string {
  const now = new Date();
  const deletionDate = new Date(scheduledDeletionAt);
  const diffMs = deletionDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day remaining";
  return `${diffDays} days remaining`;
}
