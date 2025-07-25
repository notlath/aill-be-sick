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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-base-200 border-r border-base-300 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-0 lg:flex-shrink-0`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-base-300">
            <div className="flex items-center space-x-2">
              <MessageCircle size={16} />
              <h2 className="text-lg font-medium">AI'll Be Sick</h2>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden btn btn-ghost btn-sm"
            >
              <X size={20} />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button className="btn btn-block btn-primary font-normal rounded-field">
              <Plus size={16} />
              New Chat
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4">
            <a
              href="#"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-base-300 transition-colors"
            >
              <Home size={18} />
              <span>Home</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-base-300 transition-colors"
            >
              <History size={18} />
              <span>Chat History</span>
            </a>
            <a
              href="#"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-base-300 transition-colors"
            >
              <Settings size={18} />
              <span>Settings</span>
            </a>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-base-300">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
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
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
}
