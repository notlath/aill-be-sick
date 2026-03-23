"use server";

import { actionClient } from "./client";
import { GenerateInsightsExplanationSchema } from "@/schemas/GenerateInsightsExplanationSchema";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  processTokensForDisplay,
  getTopClinicalTokens,
} from "@/utils/shap-tokens";

export const generateInsightsExplanation = actionClient
  .inputSchema(GenerateInsightsExplanationSchema)
  .action(async ({ parsedInput }) => {
    const { tokens, importances, disease, symptoms } = parsedInput;

    try {
      // Process tokens to merge subwords and filter special tokens
      const processedTokens = processTokensForDisplay(tokens, importances);

      // Get top 5 clinically-relevant tokens for the explanation
      const topTokens = getTopClinicalTokens(processedTokens, 5);
      const topTokenWords = topTokens.map((t) => t.token);

      // If we have no meaningful tokens after filtering, return a generic message
      if (topTokenWords.length === 0) {
        return {
          success: true,
          explanation:
            "The AI analyzed your description but could not identify specific keywords that strongly influenced the result. This can happen with very short or general descriptions.",
          topTokens: [],
        };
      }

      // Generate plain-English explanation using Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
You are a helpful medical AI assistant explaining how an AI symptom checker works to a general audience.

The AI analyzed this symptom description: "${symptoms}"
The AI suggested: ${disease}

The words that most influenced the AI's suggestion were: ${topTokenWords.map((w) => `"${w}"`).join(", ")}

Write a single, short paragraph (2-3 sentences maximum) explaining why these words led to the AI's suggestion. 
Use plain, simple language that anyone can understand. 
Do NOT use medical jargon.
Do NOT make any absolute diagnostic claims - always frame it as what the AI "noticed" or "considered."
Do NOT start with "The AI..." - vary your sentence structure.
Be calm and reassuring in tone.

Example good output: "Based on your description, words like 'fever' and 'rash' stood out as key indicators. These symptoms together are commonly associated with dengue, which is why the AI suggested it as a possibility."
`;

      const result = await model.generateContent(prompt);
      const explanation = result.response.text();

      return {
        success: true,
        explanation: explanation.trim(),
        topTokens: topTokenWords,
      };
    } catch (error) {
      console.error("Error generating insights explanation:", error);

      // Return a graceful fallback instead of failing
      return {
        success: true,
        explanation:
          "The AI analyzed your symptoms and identified certain keywords that influenced its suggestion. For more details, you can view the technical breakdown below.",
        topTokens: [],
      };
    }
  });
