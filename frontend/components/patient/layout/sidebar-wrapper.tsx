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
      className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width] ${
        isOpen ? "w-80 opacity-100" : "w-0 opacity-0"
      }`}
      style={{
        transitionProperty: "width, opacity",
      }}
    >
      <div
        className="w-80 p-2 pt-4 pr-0 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] delay-100"
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
