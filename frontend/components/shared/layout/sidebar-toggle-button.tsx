"use client";

import { PanelLeft } from "lucide-react";
import { useSidebar } from "./sidebar-provider";

const SidebarToggleButton = () => {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={`fixed top-4 left-4 z-50 p-2.5 bg-base-100 text-muted cursor-pointer rounded-xl shadow-sm border border-base-300/50 backdrop-blur-sm
        transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        hover:bg-base-200 hover:shadow-md hover:scale-105
        active:scale-95 active:shadow-sm
        ${
          isOpen
            ? "opacity-0 pointer-events-none -translate-x-2"
            : "opacity-100 translate-x-0"
        }`}
      aria-label="Open sidebar"
      style={{
        transitionProperty:
          "opacity, transform, background-color, box-shadow, scale",
      }}
    >
      <PanelLeft className="size-5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />
    </button>
  );
};

export default SidebarToggleButton;
