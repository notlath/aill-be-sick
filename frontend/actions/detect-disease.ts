"use server";

import axios from "axios";

// Sends symptoms to backend API to detect possible disease
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
			},
		);

		// Return detected disease on success
		return { success: data.data as string };
	} catch (error) {
		// Log and return error if detection fails
		console.error("Error detecting disease:", error);

		return { error: JSON.stringify(error) };
	}
};
