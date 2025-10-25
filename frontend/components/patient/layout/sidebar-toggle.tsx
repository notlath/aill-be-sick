"use client";

import { PanelLeft } from "lucide-react";

type SidebarToggleProps = {
  onClick: () => void;
};

const SidebarToggle = ({ onClick }: SidebarToggleProps) => {
  return (
    <button
      onClick={onClick}
      className="p-2 text-muted cursor-pointer rounded-lg
        transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
        hover:bg-base-200 hover:scale-105
        active:scale-95 active:bg-base-300"
      style={{
        transitionProperty: "background-color, transform",
      }}
    >
      <PanelLeft className="size-4 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]" />
    </button>
  );
};

export default SidebarToggle;
