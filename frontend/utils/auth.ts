import { createClient } from "./supabase/client";

const supabase = createClient();

export const signOutClient = () => {
  supabase.auth.signOut();
};
