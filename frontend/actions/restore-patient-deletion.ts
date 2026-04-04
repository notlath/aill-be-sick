"use server";

import { actionClient } from "./client";
import { RestoreDeletionSchema } from "@/schemas/RestoreDeletionSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath } from "next/cache";

export const restorePatientDeletion = actionClient
  .inputSchema(RestoreDeletionSchema)
  .action(async ({ parsedInput }) => {
    const { patientId } = parsedInput;

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
      const { createClient } = await import("@/utils/supabase/server");
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${backendUrl}/api/user/restore-deletion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ patientId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || "Failed to restore patient" };
      }

      revalidatePath("/users");
      revalidatePath(`/users/${patientId}`);

      return { success: data };
    } catch (error) {
      console.error(`Error restoring patient deletion: ${error}`);
      return { error: "Failed to restore patient. Please try again." };
    }
  });
