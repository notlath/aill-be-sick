import { getCurrentDbUser } from "@/utils/user";
import { PanelLeft } from "lucide-react";
import SignOutBtn from "./sign-out-btn";
import Image from "next/image";

const Header = async () => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    // TODO: Error handling
    return <div>Error: No user found</div>;
  }

  if (error) {
    // TODO: Error handling
    return <div>Error: {JSON.stringify(error)}</div>;
  }

  return (
    <header className="flex justify-between items-center gap-2">
      <div className="dropdown">
        <div tabIndex={0} role="button">
          <div className="flex flex-1 items-center gap-2 hover:bg-base-200 p-2 rounded-xl transition-colors cursor-pointer">
            {dbUser.avatar ? (
              <div className="cursor-pointer avatar">
                <div className="rounded-full size-8 overflow-hidden">
                  <Image
                    src={dbUser.avatar}
                    alt={dbUser.name || "Avatar"}
                    className="size-8"
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
      <button className="p-2 text-muted cursor-pointer">
        <PanelLeft className="size-4" />
      </button>
    </header>
  );
};

export default Header;
