"use server";

import axios, { AxiosError } from "axios";
import { actionClient } from "./client";
import { RunTempDiagnosisSchema } from "@/schemas/RunTempDiagnosisSchema";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const runTempDiagnosis = actionClient
  .inputSchema(RunTempDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { symptoms } = parsedInput;

    try {
      const {
        data: { data: diagnosis },
      } = await axios.post(`${BACKEND_URL}/diagnosis/new`, {
        symptoms,
      });
      const { pred, confidence, uncertainty, probs, model_used } = diagnosis;

      let diagnosisMessage = "";

      if (uncertainty <= 0.03 && confidence >= 0.9) {
        // Safe
        diagnosisMessage = `
Based on your symptom description, you might be experiencing: **${pred}**. This diagnosis was made using the **${model_used}** model with a **confidence score** of **${(
          confidence * 100
        ).toFixed(4)}%**.  \n
Here are other most likely conditions based on your symptoms:
${probs.map((prob: any) => `- ${prob}`).join("\n")}  \n

The **uncertainty score** associated with this diagnosis is **${uncertainty.toFixed(
          4
        )}%**.

A high confidence score (${(confidence * 100).toFixed(
          4
        )}%) combined with a low uncertainty score (${uncertainty.toFixed(
          4
        )}%) suggests that **this is a reliable diagnosis.**  \n

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

The **uncertainty score** associated with this diagnosis is **${uncertainty.toFixed(
          4
        )}%**.
        
A low confidence score (${(confidence * 100).toFixed(
          4
        )}%) combined with a high uncertainty score (${uncertainty.toFixed(
          4
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

The **uncertainty score** associated with this diagnosis is **${uncertainty.toFixed(
          4
        )}%**.

A high confidence score (${(confidence * 100).toFixed(
          4
        )}%) combined with a high uncertainty score (${uncertainty.toFixed(
          4
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

The **uncertainty score** associated with this diagnosis is **${uncertainty.toFixed(
          4
        )}%**.

A low confidence score (${(confidence * 100).toFixed(
          4
        )}%) combined with a low uncertainty score (${uncertainty.toFixed(
          4
        )}%) suggests that **the model is unsure about the diagnosis,** and is aware that **it needs more information to make a confident prediction for this specific case.** It is recommended to seek further medical advice or provide additional context for an accurate diagnosis.  \n

Do you want to record this diagnosis?
              `;
      }

      const transformedModelUsed = model_used
        .toUpperCase()
        .replace(/\s+/g, "_");

      const tempDiagnosis = {
        confidence,
        uncertainty,
        disease: pred.toUpperCase(),
        modelUsed: transformedModelUsed,
        symptoms,
      };

      return {
        success: {
          content: diagnosisMessage,
          type: "DIAGNOSIS",
          role: "AI",
          tempDiagnosis,
        },
      };
    } catch (error) {
      console.error("Error running diagnosis:", error);

      if (error instanceof AxiosError && error.response) {
        const errorData = error.response.data;

        if (errorData.error === "UNSUPPORTED_LANGUAGE") {
          return {
            error: "UNSUPPORTED_LANGUAGE",
            message: errorData.message,
            detectedLanguage: errorData.detected_language,
          };
        }
      }

      return { error: `Error running diagnosis: ${error}` };
    }
  });
