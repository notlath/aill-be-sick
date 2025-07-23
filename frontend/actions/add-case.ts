"use server";

import prisma from "@/prisma/prisma";
import { createClient } from "@/utils/supabase/server";

// Adds a new case to the database for the authenticated user
export const addCase = async (detectedDisease: string, symptoms: string[]) => {
	// Create Supabase client and get current user
	const supabase = await createClient();
	const supabaseUser = await supabase.auth.getUser();

	// Check if user is authenticated
	if (!supabaseUser.data.user) {
		return { error: "User not authenticated" };
	}

	// Find user in Prisma database by email
	const user = await prisma.user.findUnique({
		where: { email: supabaseUser.data.user.email },
	});

	// Check if user exists in database
	if (!user) {
		return { error: "User not found" };
	}

	try {
		// Create new case record for user
		const newCase = await prisma.case.create({
			data: {
				disease: detectedDisease,
				userId: user.id,
				symptoms: symptoms,
			},
		});
		// Fetch all cases after adding new one
		const allCases = await prisma.case.findMany();

		// Return new case and all cases on success
		return { success: newCase, allCases: allCases };
	} catch (error) {
		// Log and return error if case creation fails
		console.error("Error adding case:", error);

		return { error: JSON.stringify(error) };
	}
};
