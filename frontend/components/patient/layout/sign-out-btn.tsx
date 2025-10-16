"use client";

import { signOutClient } from "@/utils/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SignOutBtn = () => {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    setIsSigningOut(true);

    signOutClient();

    setIsSigningOut(false);

    router.refresh();
    router.push("/login");
  };

  return (
    <button
      disabled={isSigningOut}
      onClick={handleSignOut}
      role="button"
      className="active:bg-primary"
    >
      Sign out
    </button>
  );
};

export default SignOutBtn;
