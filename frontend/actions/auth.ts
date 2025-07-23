/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/prisma/prisma";
import { createClient } from "@/utils/supabase/server";

export async function login(formData: FormData) {
	const supabase = await createClient();

	// type-casting here for convenience
	// in practice, you should validate your inputs
	const data = {
		email: formData.get("email") as string,
		password: formData.get("password") as string,
	};

	const { error } = await supabase.auth.signInWithPassword(data);

	if (error) {
		redirect("/error");
	}

	revalidatePath("/", "layout");
	redirect("/");
}

export async function signup(formData: FormData) {
	const supabase = await createClient();

	// type-casting here for convenience
	// in practice, you should validate your inputs
	const data = {
		email: formData.get("email") as string,
		password: formData.get("password") as string,
	};

	const { data: authData, error } = await supabase.auth.signUp(data);

	if (error) {
		redirect("/error");
	}

	if (authData.user) {
		await prisma.user.upsert({
			where: { email: authData.user.email },
			create: {
				email: authData.user.email!,
				name: authData.user.user_metadata!.name || "",
			},
			update: {},
		});
	}

	revalidatePath("/", "layout");
	redirect("/");
}
