"use client";

import { Moon, Lightbulb } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/utils/lib";

export function ThemeToggle({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={cn("w-10 h-10 animate-pulse bg-base-300 rounded-xl", className)} />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-xl transition-[color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] text-base-content/70 hover:text-base-content hover:bg-base-200/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95 bg-transparent",
        className
      )}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Lightbulb className="size-5" strokeWidth={2} />
      ) : (
        <Moon className="size-5" strokeWidth={2} />
      )}
    </button>
  );
}
