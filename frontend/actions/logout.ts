"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { actionClient } from "./client";

/**
 * Sign out the current user and redirect to login page.
 */
export const logout = actionClient.action(async () => {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error(`Error signing out: ${error.message}`);
    return { error: `Failed to sign out: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/login");
});
