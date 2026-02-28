"use client";

import { SidebarProvider } from "./sidebar-provider";
import SidebarToggleButton from "./sidebar-toggle-button";
import MainContentWrapper from "./main-content-wrapper";
import { ReactNode, Children, Suspense } from "react";

type LayoutWrapperProps = {
  /**
   * Children can be:
   * - [sidebar, main] where the first child renders the sidebar (Server Component allowed), and the rest render main content
   * - [main] where no sidebar is provided (sidebar area remains empty)
   */
  children: ReactNode | ReactNode[];
};

const LayoutWrapper = ({ children }: LayoutWrapperProps) => {
  const childArray = Children.toArray(children);
  const hasSidebar = childArray.length > 1;
  const sidebar = hasSidebar ? childArray[0] : null;
  const main = hasSidebar ? childArray.slice(1) : childArray;

  return (
    <SidebarProvider>
      <div className="flex relative min-h-screen bg-base-200">
        <SidebarToggleButton />
        {/* Sidebar slot (may be null) */}
        {sidebar}
        <Suspense fallback={<MainContentFallback>{main}</MainContentFallback>}>
          <MainContentWrapper>{main}</MainContentWrapper>
        </Suspense>
      </div>
    </SidebarProvider>
  );
};

const MainContentFallback = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex-1 p-6 pl-20">
      <div className="bg-base-100 shadow-sm rounded-3xl w-full h-[calc(100vh-3rem)] overflow-y-auto border border-border/50">
        {children}
      </div>
    </div>
  );
};

export default LayoutWrapper;
