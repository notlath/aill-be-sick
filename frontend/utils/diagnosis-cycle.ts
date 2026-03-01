"use server";

import prisma from "@/prisma/prisma";
import axios, { AxiosError } from "axios";
import { cookies } from "next/headers";
import { revalidatePath, updateTag } from "next/cache";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:10000";

const ALLOWED_DISEASES = new Set([
  "DENGUE",
  "PNEUMONIA",
  "TYPHOID",
  "DIARRHEA",
  "MEASLES",
  "INFLUENZA",
  "IMPETIGO",
]);

const normalizeModel = (model: string): "BIOCLINICAL_MODERNBERT" | "ROBERTA_TAGALOG" => {
  const normalized = model.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if (normalized === "ROBERTA_TAGALOG") return "ROBERTA_TAGALOG";
  return "BIOCLINICAL_MODERNBERT";
};

const normalizeDisease = (disease: string):
  | "DENGUE"
  | "PNEUMONIA"
  | "TYPHOID"
  | "DIARRHEA"
  | "MEASLES"
  | "INFLUENZA"
  | "IMPETIGO" => {
  const normalized = disease.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  if (ALLOWED_DISEASES.has(normalized)) {
    return normalized as
      | "DENGUE"
      | "PNEUMONIA"
      | "TYPHOID"
      | "DIARRHEA"
      | "MEASLES"
      | "INFLUENZA"
      | "IMPETIGO";
  }

  return "INFLUENZA";
};

const hasDiagnosisAfterMessage = async (chatId: string, messageId: number) => {
  const referenceMessage = await prisma.message.findUnique({
    where: { id: messageId },
    select: { createdAt: true, id: true },
  });

  if (!referenceMessage) {
    return false;
  }

  const diagnosisMessage = await prisma.message.findFirst({
    where: {
      chatId,
      role: "AI",
      type: "DIAGNOSIS",
      OR: [
        {
          createdAt: {
            gt: referenceMessage.createdAt,
          },
        },
        {
          createdAt: referenceMessage.createdAt,
          id: {
            gt: referenceMessage.id,
          },
        },
      ],
    },
    select: { id: true },
  });

  return Boolean(diagnosisMessage);
};

const appendErrorMessage = async (chatId: string, content: string) => {
  await prisma.message.create({
    data: {
      chatId,
      role: "AI",
      type: "ERROR",
      content,
    },
  });
};

const parseExplanationTokens = (tokens: unknown) => {
  const normalize = (arr: unknown[]) =>
    arr.map((item) => {
      if (item && typeof item === "object") {
        return item;
      }

      try {
        return JSON.parse(String(item));
      } catch {
        return item;
      }
    });

  if (Array.isArray(tokens)) {
    const normalized = normalize(tokens);
    return {
      tokens: normalized.map((t: any) =>
        t && typeof t === "object" && "token" in t ? String(t.token) : String(t),
      ),
      importances: normalized.map((t: any) => {
        const value =
          t && typeof t === "object" && "importance" in t
            ? Number(t.importance)
            : Number(t);
        return Number.isFinite(value) ? value : 0;
      }),
    };
  }

  if (typeof tokens === "string") {
    try {
      const parsed = JSON.parse(tokens);
      if (Array.isArray(parsed)) {
        const normalized = normalize(parsed);
        return {
          tokens: normalized.map((t: any) =>
            t && typeof t === "object" && "token" in t ? String(t.token) : String(t),
          ),
          importances: normalized.map((t: any) => {
            const value =
              t && typeof t === "object" && "importance" in t
                ? Number(t.importance)
                : Number(t);
            return Number.isFinite(value) ? value : 0;
          }),
        };
      }
    } catch {
      return {
        tokens: [tokens],
        importances: [0],
      };
    }
  }

  return {
    tokens: [],
    importances: [],
  };
};

const createDiagnosisMessage = async ({
  chatId,
  symptoms,
  pred,
  confidence,
  uncertainty,
  probs,
  modelUsed,
}: {
  chatId: string;
  symptoms: string;
  pred: string;
  confidence: number;
  uncertainty: number;
  probs: unknown[];
  modelUsed: string;
}) => {
  const formattedProbs = Array.isArray(probs)
    ? probs.map((prob) => `- ${String(prob)}`).join("\n")
    : "";

  const content = `Based on your symptoms, the model predicts **${pred}**.

Model: **${modelUsed}**
Confidence: **${(confidence * 100).toFixed(2)}%**
Uncertainty: **${(uncertainty * 100).toFixed(2)}%**
${formattedProbs ? `\nOther likely conditions:\n${formattedProbs}` : ""}`;

  const message = await prisma.message.create({
    data: {
      chatId,
      role: "AI",
      type: "DIAGNOSIS",
      content,
      tempDiagnosis: {
        create: {
          confidence,
          uncertainty,
          modelUsed: normalizeModel(modelUsed),
          disease: normalizeDisease(pred),
          symptoms,
          chatId,
        },
      },
    },
    select: {
      id: true,
      chatId: true,
    },
  });

  return message;
};

export type DiagnosisCycleStatus =
  | "processed"
  | "already_processed"
  | "no_user_message"
  | "diagnosis_failed"
  | "chat_finalized";

export type DiagnosisCycleResult = {
  status: DiagnosisCycleStatus;
  diagnosisMessageId?: number;
  explanationReady?: boolean;
  errorCode?: string;
};

export const runDiagnosisCycleForChat = async (
  chatId: string,
): Promise<DiagnosisCycleResult> => {
  const chat = await prisma.chat.findUnique({
    where: { chatId },
    select: { hasDiagnosis: true },
  });

  if (!chat) {
    return { status: "no_user_message" };
  }

  if (chat.hasDiagnosis) {
    return { status: "chat_finalized" };
  }

  const latestUserMessage = await prisma.message.findFirst({
    where: {
      chatId,
      role: "USER",
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      content: true,
    },
  });

  if (!latestUserMessage) {
    return { status: "no_user_message" };
  }

  const alreadyProcessed = await hasDiagnosisAfterMessage(
    chatId,
    latestUserMessage.id,
  );

  if (alreadyProcessed) {
    return { status: "already_processed" };
  }

  try {
    const response = await axios.post(
      `${BACKEND_URL}/diagnosis/new`,
      { symptoms: latestUserMessage.content },
      { withCredentials: true },
    );

    const setCookieHeader = response.headers["set-cookie"];

    if (setCookieHeader) {
      const cookieStore = await cookies();

      setCookieHeader.forEach((cookieStr: string) => {
        if (cookieStr.startsWith("session=")) {
          const sessionValue = cookieStr.split(";")[0].split("=")[1];
          cookieStore.set("session", sessionValue, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60,
          });
        }
      });
    }

    const diagnosis = response.data?.data;

    if (!diagnosis) {
      await appendErrorMessage(
        chatId,
        "Could not generate diagnosis from the backend response.",
      );

      return { status: "diagnosis_failed", errorCode: "EMPTY_DIAGNOSIS_RESPONSE" };
    }

    const pendingStill = !(await hasDiagnosisAfterMessage(chatId, latestUserMessage.id));
    if (!pendingStill) {
      return { status: "already_processed" };
    }

    const diagnosisMessage = await createDiagnosisMessage({
      chatId,
      symptoms: latestUserMessage.content,
      pred: diagnosis.pred,
      confidence: diagnosis.confidence,
      uncertainty: diagnosis.uncertainty,
      probs: diagnosis.probs ?? [],
      modelUsed: diagnosis.model_used,
    });

    let explanationReady = false;

    try {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get("session");
      const cookieHeader = sessionCookie
        ? `session=${sessionCookie.value}`
        : "";

      const explainResponse = await axios.post(
        `${BACKEND_URL}/diagnosis/explain`,
        {
          mean_probs: diagnosis.mean_probs,
          symptoms: latestUserMessage.content,
        },
        {
          withCredentials: true,
          headers: {
            Cookie: cookieHeader,
          },
        },
      );

      const parsed = parseExplanationTokens(explainResponse.data?.tokens);
      
      await prisma.explanation.create({
        data: {
          messageId: diagnosisMessage.id,
          tokens: parsed.tokens,
          importances: parsed.importances,
        },
      });

      explanationReady = true;
    } catch (explainError) {
      console.error("Failed to generate explanation:", explainError);
      await appendErrorMessage(
        chatId,
        "Diagnosis generated, but explanation could not be generated for this result.",
      );
    }

    updateTag("messages");
    updateTag(`messages-${chatId}`);
    revalidatePath("/diagnosis/[chatId]", "page");

    return {
      status: "processed",
      diagnosisMessageId: diagnosisMessage.id,
      explanationReady,
    };
  } catch (error) {
    console.error("Error running diagnosis cycle:", error);

    let errorCode = "DIAGNOSIS_FAILED";
    let errorMessage =
      "Could not process your symptoms right now. Please try again.";

    if (error instanceof AxiosError && error.response?.data) {
      const backendError = error.response.data;
      if (backendError.error === "UNSUPPORTED_LANGUAGE") {
        errorCode = "UNSUPPORTED_LANGUAGE";
        errorMessage =
          backendError.message || "Unsupported language. Please use English or Tagalog.";
      } else if (backendError.error === "INSUFFICIENT_SYMPTOM_EVIDENCE") {
        errorCode = "INSUFFICIENT_SYMPTOM_EVIDENCE";
        errorMessage =
          backendError.message ||
          "Please describe your symptoms with more detail.";
      }
    }

    await appendErrorMessage(chatId, errorMessage);
    updateTag("messages");
    updateTag(`messages-${chatId}`);
    revalidatePath("/diagnosis/[chatId]", "page");

    return { status: "diagnosis_failed", errorCode };
  }
};
