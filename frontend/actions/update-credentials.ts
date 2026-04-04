"use server";

import prisma from "@/prisma/prisma";
import {
  UpdateEmailSchema,
  UpdatePasswordSchema,
} from "@/schemas/UpdateCredentialsSchema";
import { createClient } from "@/utils/supabase/server";
import { getAuthUser, getDbUserByAuthId } from "@/utils/user";
import { hasActiveDeletionSchedule } from "@/utils/check-deletion-schedule";
import { revalidatePath, revalidateTag } from "next/cache";
import { actionClient } from "./client";

async function guardDeletionSchedule(authId: string) {
  const dbUser = await getDbUserByAuthId(authId);
  if (dbUser?.role === "PATIENT") {
    const hasSchedule = await hasActiveDeletionSchedule(dbUser.id);
    if (hasSchedule) {
      return { error: "Your account is scheduled for deletion. Please keep your account or exit to continue using the app." };
    }
  }
  return null;
}

export const updateEmailAction = actionClient
  .inputSchema(UpdateEmailSchema)
  .action(async ({ parsedInput }) => {
    const { email } = parsedInput;

    const authUser = await getAuthUser();

    if (!authUser) {
      return { error: "Not authenticated" };
    }

    const guard = await guardDeletionSchedule(authUser.id);
    if (guard) return guard;

    try {
      const supabase = await createClient();

      const { error } = await supabase.auth.updateUser({ email });

      if (error) {
        console.error(`Error updating email: ${error.message}`);
        return { error: `Failed to update email: ${error.message}` };
      }

      await prisma.user.update({
        where: { authId: authUser.id },
        data: {
          email,
        },
      });

      revalidateTag(`user-${authUser.id}`, { expire: 0 });
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

    const guard = await guardDeletionSchedule(authUser.id);
    if (guard) return guard;

    try {
      const supabase = await createClient();

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error(`Error updating password: ${error.message}`);
        return { error: `Failed to update password: ${error.message}` };
      }

      return { success: true };
    } catch (error) {
      console.error(`Error updating password: ${error}`);
      return { error: "Failed to update password" };
    }
  });
