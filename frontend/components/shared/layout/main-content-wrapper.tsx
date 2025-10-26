"use client";

import { useSidebar } from "./sidebar-provider";
import { ReactNode } from "react";

type MainContentWrapperProps = {
  children: ReactNode;
};

const MainContentWrapper = ({ children }: MainContentWrapperProps) => {
  const { isOpen } = useSidebar();

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
        className="bg-base-100 border border-base-300/30 w-full h-[calc(100vh-3rem)] overflow-y-scroll rounded-3xl shadow-sm"
        style={{
          boxShadow:
            "0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04), 0 0 0 1px rgb(0 0 0 / 0.02)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default MainContentWrapper;
