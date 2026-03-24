import {
  History,
  LayoutDashboard,
  MapPin,
  OctagonAlert,
  Stethoscope,
  User,
  FileText,
  UserCheck,
} from "lucide-react";
import { DEFAULT_LANDING_PATH_BY_ROLE } from "./default-landing-path";

export type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

// Keep each role's primary nav destination aligned with DEFAULT_LANDING_PATH_BY_ROLE
// so default redirects and first nav actions always point to the same route.

export const patientNavItems: NavItem[] = [
  {
    name: "New chat",
    href: DEFAULT_LANDING_PATH_BY_ROLE.PATIENT,
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
    href: DEFAULT_LANDING_PATH_BY_ROLE.CLINICIAN,
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
    name: "Approvals",
    href: "/pending-clinicians",
    icon: UserCheck,
  },
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
