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
        )}%) suggests that **the model is unsure about the diagnosis,** and is aware that **it doesn't have enough information to make a confident prediction for this specific case.** It is recommended to seek further medical advice for an accurate diagnosis.  \n

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

      await createMessage({
        content: diagnosisMessage,
        chatId,
        type: "DIAGNOSIS",
        role: "AI",
        tempDiagnosis,
      });

      return { success: "Successfully ran diagnosis and created message" };
    } catch (error) {
      console.error("Error running diagnosis:", error);

      return { error: `Error running diagnosis: ${error}` };
    }
  });
