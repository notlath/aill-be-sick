import { createClient } from "./supabase/client";

export const signOutClient = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
};
