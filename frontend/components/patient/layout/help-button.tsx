"use client";

import { HelpCircle } from "lucide-react";
import { cn } from "@/utils/lib";

const HelpButton = () => {
  const handleClick = () => {
    localStorage.removeItem("hasSeenOnboarding");
    window.location.reload();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "group flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] relative overflow-hidden w-full",
        "hover:bg-base-200/60 hover:shadow-sm active:scale-[0.98]",
        "bg-transparent",
      )}
      style={{
        transitionProperty: "transform, background-color, box-shadow",
      }}
      title="View tutorial again"
    >
      {/* Subtle hover gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300",
          "group-hover:opacity-100",
        )}
      />

      <div
        className={cn(
          "relative z-10 p-2.5 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "group-hover:scale-105",
          "bg-base-100 text-muted group-hover:bg-base-200 group-hover:text-base-content",
        )}
      >
        <HelpCircle className="size-4.5" strokeWidth={2.5} />
      </div>

      <div
        className={cn(
          "relative z-10 font-medium text-sm tracking-tight transition-all duration-300",
          "text-base-content/70 group-hover:text-base-content",
        )}
      >
        Help
      </div>
    </button>
  );
};

export default HelpButton;
