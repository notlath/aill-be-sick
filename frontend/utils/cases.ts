"use server";

import prisma from "@/prisma/prisma";

// Fetches all cases from the database, including related user data
export const getAllCases = async () => {
	try {
		// Attempt to retrieve all case records, including associated user
		const cases = await prisma.case.findMany({
			include: {
				user: true,
			},
		});

		// Return cases on success
		return { success: cases };
	} catch (error) {
		// Log and return error if fetching fails
		console.error("Error fetching cases:", error);

		return { error: JSON.stringify(error) };
	}
};
