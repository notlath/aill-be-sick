"use server";

import prisma from "@/prisma/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import { getCurrentDbUser } from "@/utils/user";
import { canManageClinicians } from "@/utils/role-hierarchy";
import { getDefaultLandingPath } from "@/constants/default-landing-path";

export const adminLogin = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`Error logging in with email: ${error.message}`);
      return { error: `Error logging in: ${error.message}` };
    }

    // Check user role and redirect accordingly
    const user = await prisma.user.findUnique({
      where: { authId: data.user.id },
      select: { role: true },
    });

    if (!user) {
      await supabase.auth.signOut();
      return { error: "Account not found. Please contact your administrator." };
    }

    revalidatePath("/", "layout");

    // Role-based redirect
    if (user.role === "ADMIN" || user.role === "DEVELOPER") {
      redirect(getDefaultLandingPath(user.role));
    } else {
      await supabase.auth.signOut();
      return { error: "This portal is for admin accounts only." };
    }
  });

export const adminSignup = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { success: dbUser, error: authError } = await getCurrentDbUser();

    if (authError || !dbUser) {
      return { error: "Unauthorized" };
    }

    if (!canManageClinicians(dbUser.role)) {
      return { error: "Unauthorized. Admin access required." };
    }

    const { email, password } = parsedInput;
    const supabase = await createClient();

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_VERCEL_URL ??
      "http://localhost:3000";

    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback`,
      },
    });

    if (error) {
      console.error(`Error signing up with email: ${error.message}`);
      return { error: `Error signing up: ${error.message}` };
    }

    if (data.user) {
      await prisma.user.upsert({
        where: { email: data.user.email },
        create: {
          email: data.user.email!,
          name: data.user.user_metadata?.name || "",
          authId: data.user.id,
          role: "ADMIN",
        },
        update: {},
      });
    }

    return { success: true };
  });
