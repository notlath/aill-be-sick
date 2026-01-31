"use server";

import { CompareDiagnosisSchema } from "@/schemas/CompareDiagnosisSchema";
import axios from "axios";
import { actionClient } from "./client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const compareDiagnosis = actionClient
  .inputSchema(CompareDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms } = parsedInput;

    try {
      const {
        data: { data: diagnosis },
      } = await axios.post(`${BACKEND_URL}/diagnosis/new`, {
        symptoms,
      });

      return {
        success: diagnosis,
      };
    } catch (error) {
      console.error("Error running diagnosis for comparison:", error);
      if (axios.isAxiosError(error) && error.response) {
        return { error: error.response.data };
      }
      return { error: `Error running diagnosis: ${error}` };
    }
  });
