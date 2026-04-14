"use server";

import { actionClient } from "./client";
import { GenerateInsightsExplanationSchema } from "@/schemas/GenerateInsightsExplanationSchema";
import {
  processTokensForDisplay,
  getTopClinicalTokens,
} from "@/utils/shap-tokens";

export const generateInsightsExplanation = actionClient
  .inputSchema(GenerateInsightsExplanationSchema)
  .action(async ({ parsedInput }) => {
    const { tokens, importances, disease } = parsedInput;

    try {
      // Edge Case: Empty arrays or mismatched lengths
      if (!tokens || !importances || tokens.length === 0 || tokens.length !== importances.length) {
        return {
          success: true,
          explanation:
            "The system analyzed your symptoms, but could not isolate specific keywords. For more details, view the technical breakdown below.",
          topTokens: [],
        };
      }

      // Process tokens to merge subwords and filter special tokens
      const processedTokens = processTokensForDisplay(tokens, importances);

      // Get top 5 clinically-relevant tokens for the explanation
      const topTokens = getTopClinicalTokens(processedTokens, 5);
      const topTokenWords = topTokens.map((t) => t.token);

      // Edge Case: No meaningful tokens after filtering
      if (topTokenWords.length === 0) {
        return {
          success: true,
          explanation:
            "The system analyzed your description but could not identify specific keywords that strongly influenced the result. This can happen with very short or general descriptions.",
          topTokens: [],
        };
      }

      // Deterministic Natural Language Generation (NLG) based on SHAP tokens
      let explanation = "";
      
      // Edge Case: Missing disease name
      const diseaseName = disease && disease.trim() !== "" ? disease.trim() : "the suggested condition";

      if (topTokenWords.length === 1) {
        const t1 = topTokenWords[0];
        const templates = [
          `When analyzing your symptoms, the system strongly associated the word "${t1}" with ${diseaseName}.`,
          `Based on your description, mentioning "${t1}" was a key factor in suggesting ${diseaseName}.`
        ];
        explanation = templates[Math.floor(Math.random() * templates.length)];
      } else if (topTokenWords.length === 2) {
        const t1 = topTokenWords[0];
        const t2 = topTokenWords[1];
        const templates = [
          `To suggest ${diseaseName}, the system paid special attention to your words "${t1}" and "${t2}".`,
          `Your mentions of "${t1}" and "${t2}" strongly influenced the system's suggestion of ${diseaseName}.`
        ];
        explanation = templates[Math.floor(Math.random() * templates.length)];
      } else {
        // 3 or more tokens (we highlight the top 3 in the text for readability, while returning up to 5 in the array)
        const t1 = topTokenWords[0];
        const t2 = topTokenWords[1];
        const t3 = topTokenWords[2];
        const templates = [
          `When evaluating your symptoms for ${diseaseName}, the system looked closely at words like "${t1}", "${t2}", and "${t3}".`,
          `The system recognized a pattern in your description, specifically noticing "${t1}", "${t2}", and "${t3}" as indicators for ${diseaseName}.`,
          `Based on your description, words like "${t1}", "${t2}", and "${t3}" stood out as key factors for suggesting ${diseaseName}.`
        ];
        explanation = templates[Math.floor(Math.random() * templates.length)];
      }

      return {
        success: true,
        explanation: explanation,
        topTokens: topTokenWords, // Still return up to 5 tokens for the UI chips
      };
    } catch (error) {
      console.error("Error generating insights explanation:", error);

      // Graceful fallback for unexpected errors
      return {
        success: true,
        explanation:
          "The system analyzed your symptoms and identified certain keywords that influenced its suggestion. For more details, you can view the technical breakdown below.",
        topTokens: [],
      };
    }
  });
