"use client";

import { useSidebar } from "@/components/shared/layout/sidebar-provider";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from "react";

type SidebarWrapperProps = {
  children: ReactNode;
};

const SidebarWrapper = ({ children }: SidebarWrapperProps) => {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();

  useEffect(() => {
    if (window.innerWidth < 1180 && isOpen) {
      setIsOpen(false);
    }
  }, [pathname]);

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside
        className={`fixed sidebar:relative z-50 h-[100dvh] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width] bg-base-100/95 sidebar:bg-base-100/60 backdrop-blur-xl border-r border-border/50 [transition-property:width,opacity,transform] ${
          isOpen ? "w-64 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-0"
        }`}
        style={{
          boxShadow: isOpen ? "0 0 0 1px rgb(0 0 0 / 0.02)" : "none",
        }}
      >
        <div
          className={`p-4 pt-6 w-64 h-full flex flex-col transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isOpen ? "delay-150" : "delay-0"
          }`}
          style={{
            opacity: isOpen ? 1 : 0,
          }}
        >
          {children}
        </div>
      </aside>
    </>
  );
};

export default SidebarWrapper;
