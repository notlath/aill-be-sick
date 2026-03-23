"use server";

import axios, { AxiosError } from "axios";
import { getBackendUrl } from "@/utils/backend-url";
import * as z from "zod";
import { actionClient } from "./client";

const BACKEND_URL = getBackendUrl();
const FOLLOWUP_TIMEOUT_MS = 30000;

const FollowUpSchema = z.object({
  // Primary: DB session-backed flow
  session_id: z.string().optional(),

  // Legacy fields (backward compat with existing callsites)
  disease: z.string().optional(),
  confidence: z.number().optional(),
  uncertainty: z.number().optional(),
  asked_questions: z.array(z.string()).optional(),
  symptoms: z.string().optional(),
  top_diseases: z
    .array(
      z.object({
        disease: z.string(),
        probability: z.number(),
      }),
    )
    .optional(),
  force: z.boolean().optional(),
  force_complete: z.boolean().optional(), // User wants to skip to results
  mode: z.enum(["adaptive", "legacy"]).optional(),
  last_answer: z.enum(["yes", "no"]).optional(),
  last_question_id: z.string().optional(),
  last_question_text: z.string().optional(),
  current_probs: z.array(z.any()).optional(),
});

export const getFollowUpQuestion = actionClient
  .inputSchema(FollowUpSchema)
  .action(async ({ parsedInput }) => {
    const {
      session_id,
      disease,
      confidence,
      uncertainty,
      asked_questions,
      top_diseases,
      force,
      force_complete,
      symptoms,
      last_answer,
      last_question_id,
      last_question_text,
      current_probs,
    } = parsedInput;

    try {
      const payload: Record<string, unknown> = {
        // Session ID is the primary state carrier
        session_id: session_id || undefined,

        // Legacy fields for backward compat
        disease: disease || "",
        confidence: confidence ?? 0,
        uncertainty: uncertainty ?? 1,
        asked_questions: asked_questions || [],
        symptoms: symptoms || "",
        force: force || false,
        force_complete: force_complete || false, // Skip to results
        top_diseases: top_diseases || [],
        mode: process.env.NEXT_PUBLIC_DIAGNOSIS_MODE || "adaptive",

        // Follow-up context
        last_answer,
        last_question_id,
        last_question_text,

        // Bayesian state (legacy; DB session is preferred)
        current_probs: current_probs || undefined,
      };

      console.log("[FRONTEND] Sending follow-up request:", {
        session_id,
        asked_questions_count: (asked_questions || []).length,
        last_question_id,
      });

      // BRIDGE: Forward session cookie to Flask
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session");
      const cookieHeader = sessionCookie
        ? `session=${sessionCookie.value}`
        : "";

      const { data } = await axios.post(
        `${BACKEND_URL}/diagnosis/follow-up`,
        payload,
        {
          withCredentials: true,
          timeout: FOLLOWUP_TIMEOUT_MS,
          headers: {
            Cookie: cookieHeader,
          },
        },
      );

      return {
        success: {
          should_stop: data.data.should_stop,
          question: data.data.question,
          diagnosis: data.data.diagnosis,
          reason: data.data.reason,
          message: data.data.message,
          session_id: data.data.session_id || session_id,
        },
      };
    } catch (error) {
      console.error("Error getting follow-up question:", error);

      if (
        error instanceof AxiosError &&
        (error.code === "ECONNABORTED" ||
          (typeof error.message === "string" &&
            error.message.toLowerCase().includes("timeout")))
      ) {
        return {
          error:
            "Follow-up question is taking too long. Please submit your symptoms again.",
        };
      }

      if (error instanceof AxiosError && error.response) {
        const errorData = error.response.data;
        return {
          error: errorData.message || "Failed to get follow-up question",
        };
      }

      return { error: `Error getting follow-up question: ${error}` };
    }
  });
