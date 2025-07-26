"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import MobileHeader from "./MobileHeader";

interface LayoutProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export default function Layout({ children, pageTitle }: LayoutProps) {
  return (
    <div className="drawer h-screen lg:drawer-open">
      <input id="drawer-toggle" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex h-full flex-col">
        <MobileHeader title={pageTitle} />
        <main className="flex-1 overflow-hidden bg-base-100">{children}</main>
      </div>

      <Sidebar />
    </div>
  );
}
