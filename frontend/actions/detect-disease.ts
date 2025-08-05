"use server";

import axios from "axios";

// Enhanced disease detection with Naive Bayes ML model support
export const detectDisease = async (formData: FormData) => {
  // Extract symptoms from form data and convert to array
  const symptomsString = formData.get("symptoms") as string;
  const symptoms = symptomsString.split(",").map((symptom) => symptom.trim());

  try {
    // Make POST request to backend with symptoms
    const { data } = await axios.post(
      "http://localhost:8000/classifications/new",
      {
        symptoms,
      }
    );

    // Return enhanced prediction data
    return {
      success: data.data as string,
      confidence: data.confidence || 0.5,
      all_probabilities: data.all_probabilities || {},
      model_used: data.model_used || "Unknown",
      features_matched: data.features_matched || 0,
      input_symptoms: data.input_symptoms || symptoms,
      note: data.note || null,
    };
  } catch (error) {
    // Log and return error if detection fails
    console.error("Error detecting disease:", error);

    return { error: JSON.stringify(error) };
  }
};
