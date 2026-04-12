"use server";

import { RunDiagnosisSchema } from "@/schemas/RunDiagnosisSchema";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";
import axios, { AxiosError } from "axios";
import { actionClient } from "./client";
import { createMessage } from "./create-message";
import { RELIABILITY_THRESHOLDS } from "@/constants/reliability-thresholds";

const BACKEND_URL = getBackendUrl();
const DIAGNOSIS_TIMEOUT_MS = 30000;

export const runDiagnosis = actionClient
  .inputSchema(RunDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms, chatId, skipMessage } = parsedInput;
    const { success: dbUser, error } = await getCurrentDbUser();

    if (!dbUser) {
      console.error(`Error fetching user: ${error}`);

      return { error: `Error fetching user: ${error}` };
    }

    if (dbUser.role === "PATIENT") {
      const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
      if (hasSchedule) {
        return { error: "Your account is scheduled for deletion. Please keep your account or exit to continue using the app." };
      }
    }

    try {
      const response = await axios.post(
        `${BACKEND_URL}/diagnosis/new`,
        {
          symptoms,
          chat_id: chatId,
        },
        {
          withCredentials: true, // Enable session cookies
          timeout: DIAGNOSIS_TIMEOUT_MS,
        },
      );

      const diagnosis = response.data.data;

      // BRIDGE: Capture session cookie from Flask and set it in Next.js response
      const setCookieHeader = response.headers["set-cookie"];
      if (setCookieHeader) {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();

        // Parse the session cookie (usually named 'session')
        setCookieHeader.forEach((cookieStr) => {
          if (cookieStr.startsWith("session=")) {
            const sessionValue = cookieStr.split(";")[0].split("=")[1];
            // Set cookie in browser
            cookieStore.set("session", sessionValue, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              path: "/",
              maxAge: 60 * 60, // 1 hour match backend
            });
          }
        });
      }
      const {
        pred,
        confidence,
        uncertainty,
        probs,
        model_used,
        top_diseases,
        mean_probs,
        cdss,
        skip_followup,
        skip_reason,
        out_of_scope_type,
        verification_failure,
        message,
        is_valid,
        session_id: diagnosisSessionId,
      } = diagnosis;

      // Debug: Log what we received from backend
      console.log("[DEBUG] Backend response:", {
        skip_followup,
        skip_reason,
        confidence,
        uncertainty,
      });

      // Check if diagnosis is confident enough OR backend says to skip follow-up
      const isConfident =
        skip_followup || (confidence >= RELIABILITY_THRESHOLDS.reliable.minConfidence && uncertainty <= RELIABILITY_THRESHOLDS.reliable.maxUncertainty);

      const transformedModelUsed = model_used
        ? model_used.toUpperCase().replace(/\s+/g, "_")
        : undefined;

      // Only create diagnosis message if confident AND not skipping
      if (isConfident && !skipMessage) {
        let diagnosisMessage = "";

        if (uncertainty < RELIABILITY_THRESHOLDS.reliable.maxUncertainty && confidence >= RELIABILITY_THRESHOLDS.reliable.minConfidence) {
          // Safe
          diagnosisMessage = `
Based on your symptom description, your symptoms closely match standard clinical criteria for: **${pred}**.  \n
Here are other possible conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

This result suggests a strong match based on the provided information.

Do you want to record this diagnosis?
                `;
        } else if (uncertainty > RELIABILITY_THRESHOLDS.reliable.maxUncertainty && confidence < RELIABILITY_THRESHOLDS.reliable.minConfidence) {
          // Escalate to clinician
          diagnosisMessage = `
Based on your symptom description, your symptoms share some common signs with: **${pred}**.  \n
Here are other possible conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

This result is **Inconclusive**. The symptoms provided do not form a clear picture of a specific condition. **These results should not be trusted without further validation or a human expert's opinion.**  \n

Do you want to record this diagnosis?
                `;
        } else if (uncertainty > RELIABILITY_THRESHOLDS.reliable.maxUncertainty && confidence >= RELIABILITY_THRESHOLDS.reliable.minConfidence) {
          // Potential distribution shift
          diagnosisMessage = `
Based on your symptom description, your symptoms closely match standard clinical criteria for: **${pred}**, but some conflicting information was detected.  \n
Here are other possible conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

This result is a **Moderate Match**, but with a high degree of uncertainty regarding the exact presentation. **These results should not be trusted without further validation or a human expert's opinion.**  \n

Do you want to record this diagnosis?
                `;
        } else if (uncertainty <= RELIABILITY_THRESHOLDS.reliable.maxUncertainty && confidence < RELIABILITY_THRESHOLDS.reliable.minConfidence) {
          // Ambiguous case, the model doesn't know and knows that it doesn't know
          diagnosisMessage = `
Based on your symptom description, your symptoms share some common signs with: **${pred}**.  \n
Here are other possible conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

This result is a **Moderate Match**, suggesting that **the system is unsure about the diagnosis,** and needs more information to make a confident prediction for this specific case. It is recommended to seek further medical advice or provide additional context for an accurate diagnosis.  \n

Do you want to record this diagnosis?
                `;
        }

        const tempDiagnosis = {
          confidence,
          uncertainty,
          disease: pred.toUpperCase(),
          modelUsed: transformedModelUsed,
          symptoms,
        };

        await createMessage({
          content: diagnosisMessage,
          chatId,
          type: "DIAGNOSIS",
          role: "AI",
          tempDiagnosis,
        });
      }

      // Always return diagnosis info for follow-up questions
      return {
        success: "Successfully ran diagnosis",
        diagnosis: {
          disease: pred,
          confidence,
          uncertainty,
          model_used: transformedModelUsed,
          top_diseases: top_diseases || [],
          mean_probs,
          symptoms,
          cdss: cdss || null,
          skip_followup,
          skip_reason,
          out_of_scope_type,
          verification_failure,
          message,
          is_valid,
          session_id: diagnosisSessionId || undefined,
        },
        isConfident,
      };
    } catch (error) {
      console.error("Error running diagnosis:", error);

      if (
        error instanceof AxiosError &&
        (error.code === "ECONNABORTED" ||
          (typeof error.message === "string" &&
            error.message.toLowerCase().includes("timeout")))
      ) {
        return {
          error: "DIAGNOSIS_TIMEOUT",
          message:
            "Diagnosis is taking too long. Please try again with a shorter symptom summary.",
        };
      }

      if (error instanceof AxiosError && error.response) {
        const errorData = error.response.data;

        if (errorData.error === "UNSUPPORTED_LANGUAGE") {
          return {
            error: "UNSUPPORTED_LANGUAGE",
            message: errorData.message,
            detectedLanguage: errorData.detected_language,
          };
        }

        if (errorData.error === "INSUFFICIENT_SYMPTOM_EVIDENCE") {
          return {
            error: "INSUFFICIENT_SYMPTOM_EVIDENCE",
            message: errorData.message,
            details: errorData.details,
          };
        }

        if (errorData.error === "INTERNAL_ERROR") {
          return {
            error: "INTERNAL_ERROR",
            message:
              errorData.message ||
              "Internal diagnosis error. Please try again with a shorter symptom summary.",
          };
        }

        return {
          error: errorData.error || "DIAGNOSIS_FAILED",
          message: errorData.message || "Failed to process diagnosis.",
        };
      }

      return { error: `Error running diagnosis: ${error}` };
    }
  });
