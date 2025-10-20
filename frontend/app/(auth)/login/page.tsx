"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const HomePage = () => {
  const supabase = createClient();

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${
            process.env.NEXT_PUBLIC_APP_URL ??
            process.env.NEXT_PUBLIC_VERCEL_URL ??
            "http://localhost:3000"
          }/auth/callback`,
        },
      });

      console.log("Successfully logged in!");
    } catch (error) {
      console.error(`Error during Google sign-in: ${error}`);
    }
  };

  return (
    <main className="flex justify-center items-center h-screen">
      <section className="space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="font-bold text-5xl">AI'll Be Sick</h1>
          <p className="text-muted">Please continue with your Google account</p>
        </div>
        <button onClick={handleSignIn} className="btn btn-primary">
          Sign in with Google
        </button>
        <p className="text-muted text-sm">
          Not a patient? Click{" "}
          <Link href="/clinician-login" className="text-primary">
            here
          </Link>{" "}
          to log in as a clinician
        </p>
      </section>
    </main>
  );
};

export default HomePage;
