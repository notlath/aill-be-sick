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
      className={`flex-1 p-2 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        !isOpen ? "pl-16" : ""
      }`}
      style={{
        transitionProperty: "padding-left, margin-left",
      }}
    >
      <div className="bg-base-200 card-border border-muted/25 w-full h-[calc(100vh-1rem)] overflow-y-scroll card">
        {children}
      </div>
    </div>
  );
};

export default MainContentWrapper;
