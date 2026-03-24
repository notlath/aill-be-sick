"use server";

import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { actionClient } from "./client";
import {
  ApproveClinicianSchema,
  RejectClinicianSchema,
} from "@/schemas/ClinicianApprovalSchema";
import { getCurrentDbUser } from "@/utils/user";

const isAdminLike = (role: string) =>
  role === "ADMIN" || role === ("DEVELOPER" as any);

export const approveClinician = actionClient
  .inputSchema(ApproveClinicianSchema)
  .action(async ({ parsedInput }) => {
    const { success: dbUser, error } = await getCurrentDbUser();

    if (error || !dbUser || !isAdminLike(dbUser.role)) {
      return { error: "Unauthorized. Admin access required." };
    }

    const { clinicianUserId } = parsedInput;

    const clinician = await prisma.user.findUnique({
      where: { id: clinicianUserId },
      select: { id: true, role: true },
    });

    if (!clinician || clinician.role !== "CLINICIAN") {
      return { error: "Clinician account not found." };
    }

    await prisma.user.update({
      where: { id: clinicianUserId },
      data: {
        approvalStatus: "ACTIVE",
        approvedBy: dbUser.id,
        approvedAt: new Date(),
        rejectedAt: null,
        approvalNotes: null,
      },
    });

    revalidatePath("/pending-clinicians");
    revalidatePath("/users");

    return { success: true };
  });

export const rejectClinician = actionClient
  .inputSchema(RejectClinicianSchema)
  .action(async ({ parsedInput }) => {
    const { success: dbUser, error } = await getCurrentDbUser();

    if (error || !dbUser || !isAdminLike(dbUser.role)) {
      return { error: "Unauthorized. Admin access required." };
    }

    const { clinicianUserId, reason } = parsedInput;

    const clinician = await prisma.user.findUnique({
      where: { id: clinicianUserId },
      select: { id: true, role: true },
    });

    if (!clinician || clinician.role !== "CLINICIAN") {
      return { error: "Clinician account not found." };
    }

    await prisma.user.update({
      where: { id: clinicianUserId },
      data: {
        approvalStatus: "REJECTED",
        approvedBy: dbUser.id,
        approvedAt: null,
        rejectedAt: new Date(),
        approvalNotes: reason || null,
      },
    });

    revalidatePath("/pending-clinicians");
    revalidatePath("/users");

    return { success: true };
  });
