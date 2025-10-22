"use server";

import { actionClient } from "./client";
import axios, { AxiosError } from "axios";
import * as z from "zod";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

const FollowUpSchema = z.object({
  disease: z.string(),
  confidence: z.number(),
  uncertainty: z.number(),
  asked_questions: z.array(z.string()),
  symptoms: z.string().optional(),
  top_diseases: z.array(z.object({
    disease: z.string(),
    probability: z.number(),
  })).optional(),
  force: z.boolean().optional(),
  mode: z.enum(["adaptive", "legacy"]).optional(),
});

export const getFollowUpQuestion = actionClient
  .inputSchema(FollowUpSchema)
  .action(async ({ parsedInput }) => {
  const { disease, confidence, uncertainty, asked_questions, top_diseases, force, symptoms } = parsedInput;

    try {
          const { data } = await axios.post(`${BACKEND_URL}/diagnosis/follow-up`, {
            disease,
            confidence,
            uncertainty,
            asked_questions,
            symptoms: symptoms || "",
            force: force || false,
            top_diseases: top_diseases || [],
            mode: process.env.NEXT_PUBLIC_DIAGNOSIS_MODE || "adaptive",
          });

      return { success: data.data };
    } catch (error) {
      console.error("Error getting follow-up question:", error);

      if (error instanceof AxiosError && error.response) {
        const errorData = error.response.data;
        return { error: errorData.message || "Failed to get follow-up question" };
      }

      return { error: `Error getting follow-up question: ${error}` };
    }
  });
