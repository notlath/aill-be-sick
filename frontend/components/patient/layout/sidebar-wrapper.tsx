"use client";

import { useSidebar } from "@/components/shared/layout/sidebar-provider";
import { ReactNode } from "react";

type SidebarWrapperProps = {
  children: ReactNode;
};

const SidebarWrapper = ({ children }: SidebarWrapperProps) => {
  const { isOpen } = useSidebar();

  return (
    <aside
      className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width] bg-base-100/60 backdrop-blur-xl border-r border-base-300/30 ${
        isOpen ? "w-80 opacity-100" : "w-0 opacity-0"
      }`}
      style={{
        transitionProperty: "width, opacity",
        boxShadow: isOpen ? "0 0 0 1px rgb(0 0 0 / 0.02)" : "none",
      }}
    >
      <div
        className="w-80 p-4 pt-6 pr-2 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] delay-100"
        style={{
          opacity: isOpen ? 1 : 0,
        }}
      >
        {children}
      </div>
    </aside>
  );
};

export default SidebarWrapper;
