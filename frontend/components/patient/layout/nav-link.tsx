import { NavItem } from "@/constants/nav-items";
import { cn } from "@/utils/lib";
import Link from "next/link";

type NavLinkProps = {
  isActive: boolean;
} & NavItem;

const NavLink = ({ name, href, icon: Icon, isActive }: NavLinkProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] relative overflow-hidden",
        "hover:bg-base-200/60 hover:shadow-sm active:scale-[0.98]",
        isActive
          ? "bg-gradient-to-r from-primary/10 to-primary/5 shadow-sm"
          : "bg-transparent"
      )}
      style={{
        transitionProperty: "transform, background-color, box-shadow",
      }}
      key={href}
    >
      {/* Subtle hover gradient overlay */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300",
          "group-hover:opacity-100",
          isActive && "opacity-100"
        )}
      />

      <div
        className={cn(
          "relative z-10 p-2.5 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          "group-hover:scale-105",
          isActive
            ? "bg-primary text-primary-content shadow-md shadow-primary/20"
            : "bg-base-100 text-muted group-hover:bg-base-200 group-hover:text-base-content"
        )}
      >
        <Icon className="size-4.5" strokeWidth={2.5} />
      </div>

      <div
        className={cn(
          "relative z-10 font-medium text-sm tracking-tight transition-all duration-300",
          isActive
            ? "text-base-content"
            : "text-base-content/70 group-hover:text-base-content"
        )}
      >
        {name}
      </div>
    </Link>
  );
};

export default NavLink;
