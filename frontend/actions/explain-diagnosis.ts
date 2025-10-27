"use server";

import { ExplainDiagnosisSchema } from "@/schemas/ExplainDiagnosisSchema";
import { actionClient } from "./client";
import axios, { AxiosError } from "axios";
import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:10000";

export const explainDiagnosis = actionClient
  .inputSchema(ExplainDiagnosisSchema)
  .action(async ({ parsedInput }) => {
    const { meanProbs, messageId, symptoms } = parsedInput;

    try {
      const {
        data: { symptoms: text, tokens },
      } = await axios.post(`${BACKEND_URL}/diagnosis/explain`, {
        mean_probs: meanProbs,
        symptoms,
      });

      let tokensArray: string[] = [];
      let importancesArray: number[] = [];

      const normalize = (arr: any[]) => {
        return arr.map((item) => {
          if (item && typeof item === "object") {
            return item;
          }

          try {
            return JSON.parse(String(item));
          } catch (_) {
            return item;
          }
        });
      };

      if (Array.isArray(tokens)) {
        const normalized = normalize(tokens as any[]);
        tokensArray = normalized.map((t: any) => {
          if (t && typeof t === "object" && "token" in t)
            return String(t.token);
          return String(t);
        });
        importancesArray = normalized.map((t: any) => {
          if (t && typeof t === "object" && "importance" in t) {
            const n = Number(t.importance);
            return Number.isFinite(n) ? n : 0;
          }
          const n = Number(t);
          return Number.isFinite(n) ? n : 0;
        });
      } else if (typeof tokens === "string") {
        try {
          const parsed = JSON.parse(tokens);
          if (Array.isArray(parsed)) {
            const normalized = normalize(parsed);
            tokensArray = normalized.map((t: any) =>
              t && t.token ? String(t.token) : String(t)
            );
            importancesArray = normalized.map((t: any) =>
              t && t.importance ? Number(t.importance) : 0
            );
          } else {
            tokensArray = [tokens];
            importancesArray = [0];
          }
        } catch (_) {
          tokensArray = [tokens];
          importancesArray = [0];
        }
      } else {
        tokensArray = [];
        importancesArray = [];
      }

      await prisma.explanation.create({
        data: {
          tokens: tokensArray,
          importances: importancesArray,
          messageId: messageId,
        },
      });

      revalidatePath("/diagnosis/[chatId]", "page");

      return {
        success: "Successfully retrieved explanation.",
        explanation: {
          symptoms: text,
          tokens: tokensArray,
          importances: importancesArray,
        },
      };
    } catch (error) {
      console.error("Error running diagnosis:", error);

      if (error instanceof AxiosError && error.response) {
        const errorData = error.response.data;

        if (errorData.error === "EXPLANATION_ERROR") {
          return {
            error: "EXPLANATION_ERROR",
            message: errorData.message,
            detectedLanguage: errorData.detected_language,
          };
        }
      }

      return { error: `Error running explanation: ${error}` };
    }
  });
