"use client";

import { useSidebar } from "@/components/shared/layout/sidebar-provider";
import Header from "./header";
import NavLinks from "./nav-links";
import HelpButton from "./help-button";
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
      <div className="mt-auto pt-4 pb-4 border-t border-base-content/10">
        <HelpButton />
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
