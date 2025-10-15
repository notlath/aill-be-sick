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

  const dbUser = await prisma.user.findUnique({
    where: { authId: authUser.id },
  });

  if (!dbUser) {
    return { error: "No user found in the database" };
  }

  return { success: dbUser };
};
