import {
  History,
  LayoutDashboard,
  OctagonAlert,
  Stethoscope,
  TrendingUp,
  User,
} from "lucide-react";

export type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const patientNavItems: NavItem[] = [
  {
    name: "Diagnosis",
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
    name: "Trends",
    href: "/trends",
    icon: TrendingUp,
  },
  {
    name: "Healthcare Reports",
    href: "/healthcare-reports",
    icon: LayoutDashboard,
  },
];
