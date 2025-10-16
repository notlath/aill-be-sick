"use client";

import { createClient } from "@/utils/supabase/client";

const HomePage = () => {
  const supabase = createClient();

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `http://aill-be-sick.vercel.app/auth/callback`,
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
        <button
          onClick={handleSignIn}
          className="bg-primary px-3 py-2 rounded-md text-primary-foreground cursor-pointer"
        >
          Sign in with Google
        </button>
        <p className="text-muted text-sm">
          Not a patient? Click{" "}
          <a href="/clinician-login" className="text-primary">
            here
          </a>{" "}
          to log in as a clinician
        </p>
      </section>
    </main>
  );
};

export default HomePage;
