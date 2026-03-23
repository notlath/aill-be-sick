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
      className="flex-1 flex items-center justify-center gap-2 h-10 px-3 rounded-xl transition-[color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-error/10 active:scale-95 font-medium text-sm text-error/80 hover:text-error focus-visible:ring-2 focus-visible:ring-error/50 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
    >
      <LogOut className="size-4" strokeWidth={2.5} />
      {isPending ? "Signing out..." : "Sign out"}
    </button>
  );
};

export default SignOutBtn;
