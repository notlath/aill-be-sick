"use server";

import { actionClient } from "./client";
import { PatientDeletionOutcomeSchema } from "@/schemas/PatientDeletionOutcomeSchema";
import { getCurrentDbUser } from "@/utils/user";
import { revalidatePath } from "next/cache";

export const patientChooseDeletionOutcome = actionClient
  .inputSchema(PatientDeletionOutcomeSchema)
  .action(async ({ parsedInput }) => {
    const { action } = parsedInput;

    const { success: dbUser, error: userError } = await getCurrentDbUser();

    if (userError || !dbUser) {
      return { error: "Authentication required" };
    }

    if (dbUser.role !== "PATIENT") {
      return { error: "Only patients can choose their deletion outcome" };
    }

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";
      const { createClient } = await import("@/utils/supabase/server");
      const supabase = await createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (action === "restore") {
        const response = await fetch(`${backendUrl}/api/user/restore-deletion`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ patientId: dbUser.id }),
        });

        const data = await response.json();

        if (!response.ok) {
          return { error: data.error || "Failed to restore account" };
        }

        revalidatePath("/");
        revalidatePath("/diagnosis");
        revalidatePath("/history");

        return { success: data, outcome: "restored" };
      }

      if (action === "confirm") {
        const response = await fetch(`${backendUrl}/api/user/anonymize-scheduled`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer internal-skip`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          return { error: data.error || "Failed to confirm deletion" };
        }

        revalidatePath("/");
        revalidatePath("/diagnosis");
        revalidatePath("/history");

        return { success: data, outcome: "confirmed" };
      }

      return { error: "Invalid action" };
    } catch (error) {
      console.error(`Error processing deletion outcome: ${error}`);
      return { error: "Failed to process your request. Please try again." };
    }
  });
