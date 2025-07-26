"use client";
import {
  MessageCircle,
  User,
  X,
  Home,
  Settings,
  History,
  Plus,
} from "lucide-react";

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-base-300 bg-base-200 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:inset-0 lg:shrink-0 lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between border-b border-base-300 p-4">
            <div className="flex items-center space-x-2">
              <MessageCircle size={16} />
              <h2 className="text-lg font-medium">AI'll Be Sick</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="btn btn-ghost btn-sm lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button className="btn btn-block font-normal btn-primary">
              <Plus size={16} />
              New Chat
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4">
            <a
              href="#"
              className="flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors hover:bg-base-300"
            >
              <Home size={18} />
              <span>Home</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors hover:bg-base-300"
            >
              <History size={18} />
              <span>Chat History</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors hover:bg-base-300"
            >
              <Settings size={18} />
              <span>Settings</span>
            </a>
          </nav>

          {/* Sidebar Footer */}
          <div className="border-t border-base-300 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
                <User size={16} className="text-primary-content" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">User</p>
                <p className="text-xs opacity-60">user@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
