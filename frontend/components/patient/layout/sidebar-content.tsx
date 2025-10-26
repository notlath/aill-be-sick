"use client";

import { useSidebar } from "@/components/shared/layout/sidebar-provider";
import Header from "./header";
import NavLinks from "./nav-links";
import { User } from "@/app/generated/prisma";

type SidebarContentProps = {
  dbUser: User;
};

const SidebarContent = ({ dbUser }: SidebarContentProps) => {
  const { toggleSidebar } = useSidebar();

  return (
    <>
      <Header dbUser={dbUser} onToggleSidebar={toggleSidebar} />
      <NavLinks dbUser={dbUser} />
    </>
  );
};

export default SidebarContent;
