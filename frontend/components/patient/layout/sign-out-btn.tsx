"use client";

import { signOut } from "@/utils/auth";
import { useTransition } from "react";

const SignOutBtn = () => {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(() => {
      signOut();
    });
  };

  return (
    <button
      disabled={isPending}
      onClick={handleSignOut}
      role="button"
      className="active:bg-primary"
    >
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
};

export default SignOutBtn;
