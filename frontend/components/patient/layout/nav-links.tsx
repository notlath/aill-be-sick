"use client";

import { clinicianNavItems, patientNavItems } from "@/constants/nav-items";
import NavLink from "./nav-link";
import { usePathname } from "next/navigation";
import { User } from "@/app/generated/prisma";
import { useMemo, useEffect, useState } from "react";

type NavLinksProps = {
  dbUser: User;
};

const NavLinks = ({ dbUser }: NavLinksProps) => {
  const pathname = usePathname();
  const [currentView, setCurrentView] = useState<"PATIENT" | "CLINICIAN">(
    "PATIENT",
  );

  useEffect(() => {
    // For developers, check localStorage for their selected view
    if (dbUser.role === ("DEVELOPER" as any)) {
      const savedView = localStorage.getItem("developerView") as
        | "PATIENT"
        | "CLINICIAN"
        | null;
      if (savedView) {
        setCurrentView(savedView);
      } else {
        // Infer from current pathname
        if (
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/healthcare-reports") ||
          pathname.startsWith("/users") ||
          pathname.startsWith("/alerts") ||
          pathname.startsWith("/trends")
        ) {
          setCurrentView("CLINICIAN");
        } else {
          setCurrentView("PATIENT");
        }
      }
    }
  }, [dbUser.role, pathname]);

  const navItems = useMemo(() => {
    // For developers, use the current view to determine nav items
    if (dbUser.role === ("DEVELOPER" as any)) {
      return currentView === "PATIENT" ? patientNavItems : clinicianNavItems;
    }
    // For regular users, use their actual role
    return dbUser.role === "PATIENT" ? patientNavItems : clinicianNavItems;
  }, [dbUser.role, currentView]);

  return (
    <nav className="flex flex-col gap-1.5 mt-10 mb-4">
      {navItems.map((navItem) => (
        <NavLink
          key={navItem.href}
          {...navItem}
          isActive={pathname === navItem.href}
        />
      ))}
    </nav>
  );
};

export default NavLinks;
