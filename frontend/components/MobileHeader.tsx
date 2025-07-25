"use client";
import { Menu } from "lucide-react";

interface MobileHeaderProps {
  setSidebarOpen: (open: boolean) => void;
  title?: string;
}

export default function MobileHeader({
  setSidebarOpen,
  title = "AI'll Be Sick",
}: MobileHeaderProps) {
  return (
    <div className="lg:hidden flex items-center justify-between p-4 border-b border-base-300 bg-base-100 flex-shrink-0">
      <button
        onClick={() => setSidebarOpen(true)}
        className="btn btn-ghost btn-sm"
      >
        <Menu size={20} />
      </button>
      <h1 className="text-xl font-medium">{title}</h1>
      <div className="w-8"></div>
    </div>
  );
}
