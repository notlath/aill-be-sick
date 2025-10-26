"use client";

import { usePathname } from "next/navigation";
import { useSidebar } from "./sidebar-provider";
import { ReactNode } from "react";

type MainContentWrapperProps = {
  children: ReactNode;
};

const MainContentWrapper = ({ children }: MainContentWrapperProps) => {
  const { isOpen } = useSidebar();
  const pathname = usePathname();

  return (
    <div
      className={`flex-1 p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        !isOpen ? "pl-20" : ""
      }`}
      style={{
        transitionProperty: "padding-left, margin-left",
      }}
    >
      <div
        className="bg-base-100 shadow-sm border border-base-300/30 rounded-3xl w-full h-[calc(100vh-3rem)] overflow-y-auto"
        style={{
          boxShadow:
            pathname !== "/diagnosis"
              ? "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04), 0 0 0 1px rgb(0 0 0 / 0.02)"
              : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default MainContentWrapper;
