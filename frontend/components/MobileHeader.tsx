"use client";
import { Menu } from "lucide-react";

interface MobileHeaderProps {
  title?: string;
}

export default function MobileHeader({
  title = "AI'll Be Sick",
}: MobileHeaderProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-base-300 bg-base-100 p-4 lg:hidden">
      <label
        htmlFor="drawer-toggle"
        className="drawer-button btn btn-ghost btn-sm"
      >
        <Menu size={20} />
      </label>
      <h1 className="text-xl font-medium">{title}</h1>
      <div className="w-8"></div>
    </div>
  );
}
