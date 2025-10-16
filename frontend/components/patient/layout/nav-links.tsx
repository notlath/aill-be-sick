"use client";

import { patientNavItems } from "@/constants/nav-items";
import NavLink from "./nav-link";
import { usePathname } from "next/navigation";

const NavLinks = () => {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-0.5 mt-8">
      {patientNavItems.map((navItem) => (
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
