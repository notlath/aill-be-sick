"use client";

import { PanelLeft } from "lucide-react";

type SidebarToggleProps = {
  onClick: () => void;
};

const SidebarToggle = ({ onClick }: SidebarToggleProps) => {
  return (
    <button
      onClick={onClick}
      className="p-2.5 text-base-content/70 cursor-pointer rounded-xl
        transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        hover:bg-base-200/80 hover:text-base-content hover:scale-105
        active:scale-95 active:bg-base-300/60"
      style={{
        transitionProperty: "background-color, transform, color",
      }}
    >
      <PanelLeft
        className="size-4.5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        strokeWidth={2.5}
      />
    </button>
  );
};

export default SidebarToggle;
