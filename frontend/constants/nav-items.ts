import {
  History,
  LayoutDashboard,
  MapPin,
  OctagonAlert,
  Stethoscope,
  User,
  FileText
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
    name: "Surveillance",
    href: "/map",
    icon: MapPin,
  },
  {
    name: "Patterns",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Alerts",
    href: "/alerts",
    icon: OctagonAlert,
  },
  {
    name: "Reports",
    href: "/healthcare-reports",
    icon: FileText,
  },
  {
    name: "Users",
    href: "/users",
    icon: User,
  },
];

export const adminNavItems: NavItem[] = [
  {
    name: "Surveillance",
    href: "/map",
    icon: MapPin,
  },
  {
    name: "Patterns",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Alerts",
    href: "/alerts",
    icon: OctagonAlert,
  },
  {
    name: "Reports",
    href: "/healthcare-reports",
    icon: FileText,
  },
  {
    name: "Users",
    href: "/users",
    icon: User,
  },
];