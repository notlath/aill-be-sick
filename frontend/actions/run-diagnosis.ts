"use server";

import { RunDiagnosisSchema } from "@/schemas/RunDiagnosisSchema";
import { getBackendUrl } from "@/utils/backend-url";
import { getCurrentDbUser } from "@/utils/user";
import axios, { AxiosError } from "axios";
import { actionClient } from "./client";
import { createMessage } from "./create-message";

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
        skip_followup || (confidence >= 0.9 && uncertainty <= 0.03);

      const transformedModelUsed = model_used
        ? model_used.toUpperCase().replace(/\s+/g, "_")
        : undefined;

      // Only create diagnosis message if confident AND not skipping
      if (isConfident && !skipMessage) {
        let diagnosisMessage = "";

        if (uncertainty <= 0.03 && confidence >= 0.9) {
          // Safe
          diagnosisMessage = `
Based on your symptom description, you might be experiencing: **${pred}**. This diagnosis was made using the **${model_used}** model with a **confidence score** of **${(
            confidence * 100
          ).toFixed(4)}%**.  \n
Here are other most likely conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

The **uncertainty score** associated with this diagnosis is **${(
            uncertainty * 100
          ).toFixed(4)}%**.

A high confidence score (${(confidence * 100).toFixed(
            4,
          )}%) combined with a low uncertainty score (${(
            uncertainty * 100
          ).toFixed(
            4,
          )}%) suggests that **the model is confident about this diagnosis and that there's very little disagreement in predictions after repeated tests.**  \n

Do you want to record this diagnosis?
                `;
        } else if (uncertainty > 0.03 && confidence < 0.9) {
          // Escalate to clinician
          diagnosisMessage = `
Based on your symptom description, you might be experiencing: **${pred}**. This diagnosis was made using the **${model_used}** model with a **confidence score** of **${(
            confidence * 100
          ).toFixed(4)}%**.  \n
Here are other most likely conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

The **uncertainty score** associated with this diagnosis is **${(
            uncertainty * 100
          ).toFixed(4)}%**.
          
A low confidence score (${(confidence * 100).toFixed(
            4,
          )}%) combined with a high uncertainty score (${(
            uncertainty * 100
          ).toFixed(
            4,
          )}%) suggests that the model does not know the diagnosis and also does not know what the best diagnosis could be. **These results should not be trusted without further validation or a human expert's opinion.**  \n

Do you want to record this diagnosis?
                `;
        } else if (uncertainty > 0.03 && confidence >= 0.9) {
          // Potential distribution shift
          diagnosisMessage = `
Based on your symptom description, you might be experiencing: **${pred}**. This diagnosis was made using the **${model_used}** model with a **confidence score** of **${(
            confidence * 100
          ).toFixed(4)}%**.  \n
Here are other most likely conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

The **uncertainty score** associated with this diagnosis is **${(
            uncertainty * 100
          ).toFixed(4)}%**.

A high confidence score (${(confidence * 100).toFixed(
            4,
          )}%) combined with a high uncertainty score (${(
            uncertainty * 100
          ).toFixed(
            4,
          )}%) indicates **overconfidence** of the model in this diagnosis. The model is confident about the diagnosis, but is also not sure what the best diagnosis could be. This could be a sign of distribution shift, where the model is encountering data that is different from what it was trained on. **These results should not be trusted without further validation or a human expert's opinion.**  \n

Do you want to record this diagnosis?
                `;
        } else if (uncertainty <= 0.03 && confidence < 0.9) {
          // Ambiguous case, the model doesn't know and knows that it doesn't know
          diagnosisMessage = `
Based on your symptom description, you might be experiencing: **${pred}**. This diagnosis was made using the **${model_used}** model with a **confidence score** of **${(
            confidence * 100
          ).toFixed(4)}%**.  \n
Here are other most likely conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

The **uncertainty score** associated with this diagnosis is **${(
            uncertainty * 100
          ).toFixed(4)}%**.

A low confidence score (${(confidence * 100).toFixed(
            4,
          )}%) combined with a low uncertainty score (${(
            uncertainty * 100
          ).toFixed(
            4,
          )}%) suggests that **the model is unsure about the diagnosis,** and is aware that **it needs more information to make a confident prediction for this specific case.** It is recommended to seek further medical advice or provide additional context for an accurate diagnosis.  \n

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
