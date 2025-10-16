import Sidebar from "@/components/patient/layout/sidebar";
import { ReactNode } from "react";

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-2">
        <div className="bg-base-200 card-border border-muted/25 w-full h-[calc(100vh-1rem)] card">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LayoutWrapper;
