"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";
import { EmailAuthSchema } from "@/schemas/EmailAuthSchema";
import prisma from "@/prisma/prisma";

export const emailLogin = actionClient
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

      return { error: `Error logging in with email: ${error.message}` };
    }

    revalidatePath("/", "layout");
    redirect("/");
  });

export const emailSignup = actionClient
  .inputSchema(EmailAuthSchema)
  .action(async ({ parsedInput }) => {
    const { email, password } = parsedInput;
    const supabase = await createClient();

    const { error, data } = await supabase.auth.signUp({ email, password });

    if (error) {
      console.error(`Error signing up with email: ${error.message}`);

      return { error: `Error signing up with email: ${error.message}` };
    }

    if (data.user) {
      await prisma.user.upsert({
        where: { email: data.user.email },
        create: {
          email: data.user.email!,
          name: data.user.user_metadata!.name || "",
          authId: data.user.id,
          role: "CLINICIAN",
        },
        update: {},
      });
    }

    revalidatePath("/", "layout");
    redirect("/");
  });
