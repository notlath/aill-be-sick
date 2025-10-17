"use server";

import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";
import { RunDiagnosisSchema } from "@/schemas/RunDiagnosisSchema";
import { createMessage } from "./create-message";
import { revalidatePath } from "next/cache";

export const runInitialDiagnosis = actionClient
  .inputSchema(RunDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms, chatId } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);

      return { error: `Error fetching user: ${error}` };
    }

    try {
      // Python backend endpoint to run diagnosis
      const diagnosis = "Jabetis"; // Placeholder disease

      await createMessage({
        content: diagnosis,
        chatId,
        type: "DIAGNOSIS",
        role: "AI",
      });

      revalidatePath("/diagnosis/[chatId]", "page");

      return { success: "Successfully ran diagnosis" };
    } catch (error) {
      console.error("Error running diagnosis:", error);

      return { error: `Error running diagnosis: ${error}` };
    }
  });
