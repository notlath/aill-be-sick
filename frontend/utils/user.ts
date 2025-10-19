"use server";

import prisma from "@/prisma/prisma";
import { createClient } from "./supabase/server";

export const getAuthUser = async () => {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  return user.data.user;
};

export const getCurrentDbUser = async () => {
  const authUser = await getAuthUser();

  if (!authUser) {
    return { error: "No authenticated user found" };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (!dbUser) {
      return { error: "No user found in the database" };
    }

    return { success: dbUser };
  } catch (error) {
    console.error(`Error fetching user from database: ${error}`);

    return { error: `Error fetching user from database: ${error}` };
  }
};

export const getAllPatients = async () => {
  try {
    const patients = await prisma.user.findMany({
      where: { role: "PATIENT" },
    });

    return { success: patients };
  } catch (error) {
    console.error(`Error fetching patients from database: ${error}`);

    return { error: `Error fetching patients from database: ${error}` };
  }
};

export const getTotalPatientsCount = async () => {
  try {
    const count = await prisma.user.count({
      where: { role: "PATIENT" },
    });

    return { success: count };
  } catch (error) {
    console.error(`Error fetching total patients count: ${error}`);

    return { error: `Error fetching total patients count: ${error}` };
  }
};
