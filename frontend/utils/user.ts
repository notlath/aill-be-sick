"use server";

import { createClient } from "./supabase/server";

export const getAuthUser = async () => {
	const supabase = await createClient();
	const user = await supabase.auth.getUser();

	return user.data.user;
};
