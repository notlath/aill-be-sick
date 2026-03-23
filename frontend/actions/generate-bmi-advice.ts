"use server";

import { actionClient } from "./client";
import { z } from "zod";
import prisma from "@/prisma/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { revalidatePath } from "next/cache";

const BmiSchema = z.object({
  diagnosisId: z.number(),
  heightCm: z.number().min(50).max(300),
  weightKg: z.number().min(2).max(500),
});

export const generateBmiAdvice = actionClient
  .inputSchema(BmiSchema)
  .action(async ({ parsedInput }) => {
    const { diagnosisId, heightCm, weightKg } = parsedInput;

    try {
      // Get the diagnosis to know the context (disease, symptoms)
      const diagnosis = await prisma.diagnosis.findUnique({
        where: { id: diagnosisId },
        include: { user: true },
      });

      if (!diagnosis) {
        throw new Error("Diagnosis not found");
      }

      // Calculate BMI
      const heightM = heightCm / 100;
      const bmi = weightKg / (heightM * heightM);
      
      let bmiCategory = "Normal weight";
      if (bmi < 18.5) bmiCategory = "Underweight";
      else if (bmi >= 25 && bmi < 29.9) bmiCategory = "Overweight";
      else if (bmi >= 30) bmiCategory = "Obese";

      // Call Gemini for personalized advice
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        You are a supportive, professional health AI assistant.
        A patient has just been assessed for symptoms including: ${diagnosis.symptoms}.
        The AI predicted: ${diagnosis.disease}.
        
        The patient's BMI is ${bmi.toFixed(1)} (${bmiCategory}) based on a height of ${heightCm}cm and weight of ${weightKg}kg.
        
        Please provide a short, compassionate, and practical piece of health advice (maximum 3 short paragraphs) 
        that considers their BMI category and how it might relate to their general immunity, recovery, or overall well-being.
        Keep the tone calm, respectful, and supportive. Avoid absolute claims or medical jargon.
        Use plain language suitable for the general public.
        Focus on practical, actionable advice like hydration, rest, or nutrition.
        Do not use markdown headers (#), just plain text with paragraphs.
      `;

      const result = await model.generateContent(prompt);
      const advice = result.response.text();

      // Save to database
      await prisma.diagnosis.update({
        where: { id: diagnosisId },
        data: {
          heightCm,
          weightKg,
          bmiAdvice: advice,
        },
      });

      revalidatePath(`/diagnosis/${diagnosis.chatId}`);

      return {
        success: true,
        bmi: bmi.toFixed(1),
        category: bmiCategory,
        advice,
      };
    } catch (error) {
      console.error("Error generating BMI advice:", error);
      return { success: false, error: "Failed to generate health advice. Please try again." };
    }
  });