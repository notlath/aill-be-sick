"use client";

import { useSidebar } from "@/components/shared/layout/sidebar-provider";
import Header from "./header";
import NavLinks from "./nav-links";
import SignOutBtn from "./sign-out-btn";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { User } from "@/lib/generated/prisma";
import { Suspense } from "react";

type SidebarContentProps = {
  dbUser: User;
};

const SidebarContent = ({ dbUser }: SidebarContentProps) => {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <Header dbUser={dbUser} onToggleSidebar={toggleSidebar} />
      <Suspense fallback={<NavLinksFallback />}>
        <NavLinks dbUser={dbUser} />
      </Suspense>
      <div className="mt-auto pt-4 flex items-center justify-between gap-2 pb-4 border-t border-base-content/10">
        <ThemeToggle />
        <SignOutBtn />
      </div>
    </>
  );
};

const NavLinksFallback = () => {
  return (
    <nav className="flex flex-col gap-1.5 mt-10 mb-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-10 rounded-xl bg-base-300/50 animate-pulse" />
      ))}
    </nav>
  );
};

export default SidebarContent;
