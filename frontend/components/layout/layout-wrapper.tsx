import { ReactNode } from "react";

const LayoutWrapper = ({ children }: { children: ReactNode }) => {
  return (
    <div className="p-2">
      <div className="bg-base-200 card-border w-full h-[calc(100vh-1rem)] card">
        {children}
      </div>
    </div>
  );
};

export default LayoutWrapper;
