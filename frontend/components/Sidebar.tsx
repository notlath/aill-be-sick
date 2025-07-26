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

export default function Sidebar() {
  return (
    <div className="drawer-side">
      <label
        htmlFor="drawer-toggle"
        aria-label="close sidebar"
        className="drawer-overlay"
      ></label>
      <div className="menu flex min-h-full w-64 flex-col bg-base-200 text-base-content">
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-base-300 p-4">
          <div className="flex items-center space-x-2">
            <MessageCircle size={16} />
            <h2 className="text-lg font-medium">AI'll Be Sick</h2>
          </div>
          <label
            htmlFor="drawer-toggle"
            className="btn btn-ghost btn-sm lg:hidden"
          >
            <X size={20} />
          </label>
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
          <ul className="menu">
            <li>
              <a href="#" className="flex items-center space-x-3">
                <Home size={18} />
                <span>Home</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center space-x-3">
                <History size={18} />
                <span>Chat History</span>
              </a>
            </li>
            <li>
              <a href="#" className="flex items-center space-x-3">
                <Settings size={18} />
                <span>Settings</span>
              </a>
            </li>
          </ul>
        </nav>

        {/* Sidebar Footer */}
        <div className="mt-auto border-t border-base-300 p-4">
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
  );
}
