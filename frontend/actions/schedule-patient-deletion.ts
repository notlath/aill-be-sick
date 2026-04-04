"use server";

import { actionClient } from "./client";
import { ScheduleDeletionSchema } from "@/schemas/ScheduleDeletionSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export const schedulePatientDeletion = actionClient
  .inputSchema(ScheduleDeletionSchema)
  .action(async ({ parsedInput }) => {
    const { patientId, reason } = parsedInput;

    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (userError || !dbUser) {
      return { error: "Authentication required" };
    }

    const allowedRoles = ["ADMIN", "DEVELOPER"];
    if (!allowedRoles.includes(dbUser.role)) {
      return { error: "Permission denied" };
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${backendUrl}/api/user/schedule-deletion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ patientId, reason }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Failed to schedule deletion" };
      }

      revalidatePath("/users");
      revalidatePath(`/users/${patientId}`);

      return { success: data };
    } catch (error) {
      console.error(`Error scheduling patient deletion: ${error}`);
      return { error: "Failed to schedule deletion. Please try again." };
    }
  });
