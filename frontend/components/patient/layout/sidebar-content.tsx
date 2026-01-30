"use client";

import { useSidebar } from "@/components/shared/layout/sidebar-provider";
import Header from "./header";
import NavLinks from "./nav-links";
import HelpButton from "./help-button";
import { User } from "@/lib/generated/prisma";

type SidebarContentProps = {
  dbUser: User;
};

const SidebarContent = ({ dbUser }: SidebarContentProps) => {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <Header dbUser={dbUser} onToggleSidebar={toggleSidebar} />
      <NavLinks dbUser={dbUser} />
      <div className="mt-auto pt-4 pb-4 border-t border-base-content/10">
        <HelpButton />
      </div>
    </>
  );
};

export default SidebarContent;
