"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getAuthUser } from "@/utils/user";

const HomePage = () => {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  const fetchUser = async () => {
    try {
      const authUser = await getAuthUser();

      setUser(authUser);

      console.log(authUser);
    } catch (error) {
      console.error(`Error fetching user: ${error}`);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

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
    <main className="flex flex-col justify-center items-center h-full">
      <h1>Hello, {user?.user_metadata.full_name}!</h1>
      <button onClick={handleSignOut} type="button">
        Sign out
      </button>
    </main>
  );
};

export default HomePage;
