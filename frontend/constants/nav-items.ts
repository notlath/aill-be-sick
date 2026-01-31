import {
  History,
  LayoutDashboard,
  MapPin,
  OctagonAlert,
  Stethoscope, User
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const patientNavItems: NavItem[] = [
  {
    name: "New chat",
    href: "/diagnosis",
    icon: Stethoscope,
  },
  {
    name: "History",
    href: "/history",
    icon: History,
  },
];

export const clinicianNavItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Users",
    href: "/users",
    icon: User,
  },
  {
    name: "Alerts",
    href: "/alerts",
    icon: OctagonAlert,
  },
  {
    name: "Map",
    href: "/map",
    icon: MapPin,
  },
  {
    name: "Healthcare Reports",
    href: "/healthcare-reports",
    icon: LayoutDashboard,
  },
];
