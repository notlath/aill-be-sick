"use client";

import { createClient } from "@/utils/supabase/client";

const HomePage = () => {
	const supabase = createClient();

	const handleSignIn = async () => {
		try {
			await supabase.auth.signInWithOAuth({
				provider: "google",
				options: {
					redirectTo: `http://localhost:3000/auth/callback`,
				},
			});

			console.log("Successfully logged in!");
		} catch (error) {
			console.error(`Error during Google sign-in: ${error}`);
		}
	};

	return (
		<main>
			<h1>Hello, world!</h1>
			<button type="button" onClick={handleSignIn}>
				Sign in with Google
			</button>
		</main>
	);
};

export default HomePage;
