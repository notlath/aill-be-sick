"use server";

import prisma from "@/prisma/prisma";

// Fetches all users from the database using Prisma ORM
export const getAllUsers = async () => {
	try {
		// Attempt to retrieve all user records
		const users = await prisma.user.findMany();

		// Return users on success
		return { success: users };
	} catch (error) {
		// Log and return error if fetching fails
		console.error("Error fetching users: ", error);

		return { error: JSON.stringify(error) };
	}
};
