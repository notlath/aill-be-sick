import { getCurrentDbUser } from "@/utils/user";
import { PanelLeft } from "lucide-react";
import SignOutBtn from "./sign-out-btn";

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
            <div className="cursor-pointer avatar">
              <div className="rounded-full size-8">
                <img src={dbUser.avatar || ""} />
              </div>
            </div>
            <p className="flex-1 min-w-60 font-medium">{dbUser.name}</p>
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
