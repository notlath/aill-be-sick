"use server";

import prisma from "@/prisma/prisma";
import { createClient } from "./supabase/server";
import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

export const getAuthUser = async () => {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();

  return user.data.user;
};

export const getDbUserByAuthId = async (authId: string) => {
  "use cache";
  cacheLife("hours");
  cacheTag(`user-${authId}`);
  
  return await prisma.user.findUnique({
    where: { authId },
  });
};

export const getCurrentDbUser = async () => {
  await connection();
  const authUser = await getAuthUser();

  if (!authUser) {
    return { error: "No authenticated user found", code: "NOT_AUTHENTICATED" };
  }

  try {
    const dbUser = await getDbUserByAuthId(authUser.id);

    if (!dbUser) {
      return { error: "No user found in the database", code: "USER_NOT_FOUND" };
    }

    return { success: dbUser };
  } catch (error) {
    console.error(`Error fetching user from database: ${error}`);

    return { error: `Error fetching user from database: ${error}`, code: "DB_ERROR" };
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

export const getAllUsers = async (currentUserRole?: string) => {
  try {
    const whereClause = currentUserRole === "CLINICIAN" ? { role: "PATIENT" as const } : {};

    const users = await prisma.user.findMany({
      where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
      include: {
        _count: {
          select: { diagnoses: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { success: users };
  } catch (error) {
    console.error(`Error fetching all users from database: ${error}`);

    return { error: `Error fetching all users from database: ${error}` };
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
