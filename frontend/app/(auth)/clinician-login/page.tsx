"use client";

import { createClient } from "@/utils/supabase/client";

const ClinicianLoginPage = () => {
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
          <p className="text-muted">Clinician login page (to be done)</p>
        </div>
      </section>
    </main>
  );
};

export default ClinicianLoginPage;
