import { NavItem } from "@/constants/nav-items";
import { cn } from "@/utils/lib";

type NavLinkProps = {
  isActive: boolean;
} & NavItem;

const NavLink = ({ name, href, icon: Icon, isActive }: NavLinkProps) => {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-2 bg-base-300 hover:bg-base-200 opacity-75 p-2 border border-transparent hover:border-border rounded-xl transition-all",
        isActive && "bg-base-200 border-border opacity-100"
      )}
      key={href}
    >
      <div className="bg-base-100 p-2 rounded-full">
        <Icon className="size-4" />
      </div>
      <div>{name}</div>
    </a>
  );
};

export default NavLink;
