import Sidebar from "@/components/patient/layout/sidebar";
import { SidebarProvider } from "./sidebar-provider";
import SidebarToggleButton from "./sidebar-toggle-button";
import MainContentWrapper from "./main-content-wrapper";
import { ReactNode } from "react";

const LayoutWrapper = async ({ children }: { children: ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="flex relative min-h-screen bg-base-200">
        <SidebarToggleButton />
        <Sidebar />
        <MainContentWrapper>{children}</MainContentWrapper>
      </div>
    </SidebarProvider>
  );
};

export default LayoutWrapper;
