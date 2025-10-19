import Header from "./header";
import NavLinks from "./nav-links";
import { getCurrentDbUser } from "@/utils/user";

const Sidebar = async () => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    // TODO: Error handling
    return null;
  }

  if (error) {
    // TODO: Error handling
    return <div>Error: {JSON.stringify(error)}</div>;
  }

  return (
    <aside className="p-2 pt-4 pr-0 min-w-80">
      <Header dbUser={dbUser} />
      <NavLinks dbUser={dbUser} />
    </aside>
  );
};

export default Sidebar;
