"use server";

import { ExplainDiagnosisSchema } from "@/schemas/ExplainDiagnosisSchema";
import { actionClient } from "./client";
import axios from "axios";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const explainDiagnosis = actionClient
  .inputSchema(ExplainDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms, meanProbs } = parsedInput;

    try {
      const {
        data: { symptoms: text, tokens },
      } = await axios.post(`${BACKEND_URL}/diagnosis/explain`, {
        symptoms,
        mean_probs: meanProbs,
      });

      return {
        success: "Successfully retrieved explanation.",
        explanation: {
          symptoms: text,
          tokens,
        },
      };
    } catch (error) {
      console.error(error);

      return { error };
    }
  });
