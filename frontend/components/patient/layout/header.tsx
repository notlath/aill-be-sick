import SignOutBtn from "./sign-out-btn";
import SidebarToggle from "./sidebar-toggle";
import ViewSwitcherBtn from "./view-switcher-btn";
import Image from "next/image";
import { User } from "@/lib/generated/prisma";

type HeaderProps = {
  dbUser: User;
  onToggleSidebar: () => void;
};

const Header = ({ dbUser, onToggleSidebar }: HeaderProps) => {
  return (
    <header className="flex justify-between items-center gap-3 mb-6 bg-base-300/40 p-1 rounded-xl -mx-1">
      <div className="dropdown">
        <div tabIndex={0} role="button">
          <div className="flex flex-1 items-center gap-3 hover:bg-base-200/60 p-2.5 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer group backdrop-blur-sm">
            {dbUser.avatar ? (
              <div className="cursor-pointer avatar">
                <div className="size-9 rounded-full overflow-hidden ring-2 ring-base-300/50 transition-all duration-300 group-hover:ring-primary/30">
                  <Image
                    src={dbUser.avatar}
                    alt={dbUser.name || "Avatar"}
                    className="rounded-full size-9 object-cover"
                    fill
                  />
                </div>
              </div>
            ) : (
              <div className="cursor-pointer avatar avatar-placeholder group">
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-full size-9 ring-2 ring-base-300/50 transition-all duration-300 group-hover:ring-primary/30 flex items-center justify-center">
                  <span className="font-semibold text-base text-primary">
                    {dbUser.name?.charAt(0)}
                  </span>
                </div>
              </div>
            )}
            <p className="flex-1 font-semibold text-base-content/90 tracking-tight text-sm">
              {dbUser.name}
            </p>
          </div>
        </div>
        <ul
          tabIndex={-1}
          className="z-[100] bg-base-100/95 backdrop-blur-xl shadow-xl border border-base-300/50 p-1.5 rounded-2xl w-56 dropdown-content menu mt-2"
          style={{
            boxShadow:
              "0 20px 25px -5px rgb(0 0 0 / 0.08), 0 8px 10px -6px rgb(0 0 0 / 0.08)",
          }}
        >
          {dbUser.role === ("DEVELOPER" as any) && (
            <li>
              <ViewSwitcherBtn isDeveloper={true} />
            </li>
          )}
          <li>
            <button
              role="button"
              className="rounded-xl transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-200/80 active:scale-95 font-medium text-base-content/80 hover:text-base-content"
            >
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
