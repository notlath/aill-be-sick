import { History, Stethoscope } from "lucide-react";

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
