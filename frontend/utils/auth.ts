"use server";

import { createClient } from "./supabase/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const signOut = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
};
