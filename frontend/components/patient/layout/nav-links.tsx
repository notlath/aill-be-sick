"use client";

import { clinicianNavItems, patientNavItems } from "@/constants/nav-items";
import NavLink from "./nav-link";
import { usePathname } from "next/navigation";
import { User } from "@/app/generated/prisma";
import { useMemo } from "react";

type NavLinksProps = {
  dbUser: User;
};

const NavLinks = ({ dbUser }: NavLinksProps) => {
  const pathname = usePathname();
  const navItems = useMemo(
    () => (dbUser.role === "PATIENT" ? patientNavItems : clinicianNavItems),
    [dbUser.role, dbUser]
  );

  return (
    <div className="flex flex-col gap-0.5 mt-8">
      {navItems.map((navItem) => (
        <NavLink
          key={navItem.href}
          {...navItem}
          isActive={pathname === navItem.href}
        />
      ))}
    </div>
  );
};

export default NavLinks;
