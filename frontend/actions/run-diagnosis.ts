"use server";

import { getCurrentDbUser } from "@/utils/user";
import { actionClient } from "./client";
import { RunDiagnosisSchema } from "@/schemas/RunDiagnosisSchema";
import { createMessage } from "./create-message";
import axios from "axios";

export const runDiagnosis = actionClient
  .inputSchema(RunDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms, chatId } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);

      return { error: `Error fetching user: ${error}` };
    }

    try {
      const {
        data: { data: diagnosis },
      } = await axios.post("http://127.0.0.1:8000/diagnosis/new", {
        symptoms,
      });
      const { disease, score, model_used } = diagnosis;

      const diagnosisMessage = `
Based on your symptom description, you might be experiencing: **${disease}**. This diagnosis was made using the **${model_used}** model with a confidence score of **${(
        score * 100
      ).toFixed(2)}%**.

Do you want to record this diagnosis?
      `;

      // const diagnosisMessage = `Based on your symptom description, I am **${(
      //   score * 100
      // ).toFixed(2)}%** confident that you may have **${disease}**.

      await createMessage({
        content: diagnosisMessage,
        chatId,
        type: "DIAGNOSIS",
        role: "AI",
      });

      return { success: "Successfully ran diagnosis" };
    } catch (error) {
      console.error("Error running diagnosis:", error);

      return { error: `Error running diagnosis: ${error}` };
    }
  });
