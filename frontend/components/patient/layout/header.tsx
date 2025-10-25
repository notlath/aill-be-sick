import SignOutBtn from "./sign-out-btn";
import SidebarToggle from "./sidebar-toggle";
import Image from "next/image";
import { User } from "@/app/generated/prisma";

type HeaderProps = {
  dbUser: User;
  onToggleSidebar: () => void;
};

const Header = ({ dbUser, onToggleSidebar }: HeaderProps) => {
  return (
    <header className="flex justify-between items-center gap-2">
      <div className="dropdown">
        <div tabIndex={0} role="button">
          <div className="flex flex-1 items-center gap-2 hover:bg-base-200 p-2 rounded-xl transition-colors cursor-pointer">
            {dbUser.avatar ? (
              <div className="cursor-pointer avatar">
                <div className="size-8 overflow-hidden">
                  <Image
                    src={dbUser.avatar}
                    alt={dbUser.name || "Avatar"}
                    className="rounded-full size-8"
                    fill
                  />
                </div>
              </div>
            ) : (
              <div className="cursor-pointer avatar avatar-placeholder">
                <div className="bg-base-200 rounded-full size-8">
                  <span className="font-medium">{dbUser.name?.charAt(0)}</span>
                </div>
              </div>
            )}
            <p className="flex-1 font-medium">{dbUser.name}</p>
          </div>
        </div>
        <ul
          tabIndex={-1}
          className="z-1 bg-base-100 shadow-sm p-2 rounded-xl w-52 dropdown-content menu"
        >
          <li>
            <button role="button" className="active:bg-primary">
              Profile
            </button>
          </li>
          <li>
            <SignOutBtn />
          </li>
        </ul>
      </div>
      <SidebarToggle onClick={onToggleSidebar} />
    </header>
  );
};

export default Header;
