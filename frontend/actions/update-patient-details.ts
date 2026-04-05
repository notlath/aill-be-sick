"use server";

import prisma from "@/prisma/prisma";
import { UpdatePatientSchema } from "@/schemas/UpdatePatientSchema";
import { getCurrentDbUser } from "@/utils/user";
import { canCreatePatient } from "@/utils/role-hierarchy";
import { revalidatePath } from "next/cache";
import { actionClient } from "./client";

export const updatePatientDetails = actionClient
  .inputSchema(UpdatePatientSchema)
  .action(async ({ parsedInput }) => {
    const {
      patientId,
      name,
      gender,
      birthday,
      address,
      district,
      city,
      barangay,
      region,
      province,
      latitude,
      longitude,
    } = parsedInput;

    const result = await getCurrentDbUser();

    if ("error" in result) {
      return { error: "Not authenticated" };
    }

    if (!canCreatePatient(result.success.role)) {
      return { error: "Permission denied" };
    }

    try {
      const patient = await prisma.user.findUnique({
        where: { id: patientId },
      });

      if (!patient) {
        return { error: "Patient not found" };
      }

      if (patient.role !== "PATIENT") {
        return { error: "Can only update patient accounts" };
      }

      await prisma.user.update({
        where: { id: patientId },
        data: {
          name,
          gender: gender || null,
          birthday: new Date(birthday),
          address: address || null,
          district: district || null,
          city: city || null,
          barangay: barangay || null,
          region: region || null,
          province: province || null,
          latitude: latitude || null,
          longitude: longitude || null,
        },
      });

      revalidatePath("/users");
      revalidatePath(`/users/${patientId}`);

      return { success: true };
    } catch (error) {
      console.error(`Error updating patient details: ${error}`);
      return { error: "Failed to update patient details" };
    }
  });
