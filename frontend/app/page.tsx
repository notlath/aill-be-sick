"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const HomePage = () => {
	const supabase = createClient();
	const router = useRouter();

	const handleSignOut = async () => {
		try {
			await supabase.auth.signOut();

			router.refresh();

			console.log("Successfully signed out!");
		} catch (error) {
			console.error(`Error signing out: ${error}`);
		}
	};

	return (
		<main>
			<h1>Hello, world!</h1>
			<button onClick={handleSignOut} type="button">
				Sign out
			</button>
		</main>
	);
};

export default HomePage;
