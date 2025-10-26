"use client";

import { signOut } from "@/utils/auth";
import { useTransition } from "react";
import { LogOut } from "lucide-react";

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
      className="flex items-center gap-2 rounded-xl transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-error/10 active:scale-95 font-medium text-error/80 hover:text-error disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <LogOut className="size-4" strokeWidth={2.5} />
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
};

export default SignOutBtn;
