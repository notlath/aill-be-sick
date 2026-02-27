"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

const HomePage = () => {
  const supabase = createClient();


  const handleSignIn = async () => {
    try {
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ??
        process.env.NEXT_PUBLIC_VERCEL_URL ??
        "http://localhost:3000";

      // Ensure PKCE is enabled by using the proper Supabase client method
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${appUrl}/auth/callback`,
          // PKCE is enabled by default in @supabase/supabase-js v2+
        },
      });

      if (error) {
        console.error(`Error during Google sign-in: ${error.message}`);
      } else {
        console.log("OAuth flow initiated successfully");
      }
    } catch (error) {
      console.error(`Error during Google sign-in: ${error}`);
    }
  };

  return (
    <main className="flex h-screen items-center justify-center">
      <section className="space-y-4 text-center">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold">AI'll Be Sick</h1>
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
