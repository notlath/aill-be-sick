"use client";

import { PanelLeft, PanelLeftClose } from "lucide-react";
import { useSidebar } from "./sidebar-provider";

const SidebarToggleButton = () => {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <button
      onClick={toggleSidebar}
      className={`fixed top-5 left-5 z-50 p-3 bg-base-100/80 text-base-content/70 cursor-pointer rounded-2xl border border-base-300/40 backdrop-blur-xl
        transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
        hover:bg-base-100 hover:text-base-content hover:border-base-300/60 hover:scale-[1.08]
        active:scale-95
        ${
          isOpen
            ? "opacity-100 translate-x-0 md:opacity-100"
            : "opacity-100 translate-x-0"
        }`}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      style={{
        transitionProperty:
          "opacity, transform, background-color, box-shadow, border-color, color",
        boxShadow:
          "0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.06), 0 0 0 1px rgb(0 0 0 / 0.02)",
      }}
    >
      {isOpen ? (
        <PanelLeftClose
          className="size-5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          strokeWidth={2}
        />
      ) : (
        <PanelLeft
          className="size-5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          strokeWidth={2}
        />
      )}
    </button>
  );
};

export default SidebarToggleButton;
