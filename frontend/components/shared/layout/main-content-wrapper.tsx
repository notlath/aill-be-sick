"use client";

import { cn } from "@/utils/lib";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { useSidebar } from "./sidebar-provider";

type MainContentWrapperProps = {
  children: ReactNode;
};

const MainContentWrapper = ({ children }: MainContentWrapperProps) => {
  const { isOpen } = useSidebar();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex-1 p-3 sidebar:p-6 w-full max-w-[100vw] transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        !isOpen && "sidebar:pl-20"
      )}
      style={{
        transitionProperty: "padding-left, margin-left",
      }}
    >
      <div
        className={cn(
          "bg-base-100 shadow-sm rounded-2xl sidebar:rounded-3xl w-full h-[calc(100dvh-1.5rem)] sidebar:h-[calc(100vh-3rem)] overflow-y-auto",
          pathname !== "/diagnosis" && "border border-border/50"
        )}
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
