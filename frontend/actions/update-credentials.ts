"use server";

import { revalidatePath, updateTag } from "next/cache";
import { actionClient } from "./client";
import { UpdateEmailSchema, UpdatePasswordSchema } from "@/schemas/UpdateCredentialsSchema";
import { createClient } from "@/utils/supabase/server";
import { getAuthUser } from "@/utils/user";
import prisma from "@/prisma/prisma";

export const updateEmailAction = actionClient
  .inputSchema(UpdateEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    try {
      const supabase = await createClient();
      
      const { error } = await supabase.auth.updateUser({ email });

      if (error) {
         console.error(`Error updating email: ${error.message}`);
         return { error: `Failed to update email: ${error.message}` };
      }

      // Also update the database record
      await prisma.user.update({
        where: { authId: authUser.id },
        data: {
          email,
        }
      });

      updateTag(`user-${authUser.id}`);
      revalidatePath("/", "layout");

      return { success: true };
    } catch (error) {
      console.error(`Error updating email: ${error}`);
      return { error: "Failed to update email" };
    }
  });

export const updatePasswordAction = actionClient
  .inputSchema(UpdatePasswordSchema)
  .action(async ({ parsedInput }) => {
    const { password } = parsedInput;

    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    try {
      const supabase = await createClient();
      
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
         console.error(`Error updating password: ${error.message}`);
         return { error: `Failed to update password: ${error.message}` };
      }

      // We do not redirect here, so the user can just see a success status.
      return { success: true };
    } catch (error) {
      console.error(`Error updating password: ${error}`);
      return { error: "Failed to update password" };
    }
  });
