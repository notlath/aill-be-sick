import SidebarWrapper from "./sidebar-wrapper";
import SidebarContent from "./sidebar-content";
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
    <SidebarWrapper>
      <SidebarContent dbUser={dbUser} />
    </SidebarWrapper>
  );
};

export default Sidebar;
