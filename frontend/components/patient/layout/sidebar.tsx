import SidebarWrapper from "./sidebar-wrapper";
import SidebarContent from "./sidebar-content";
import { User } from "@/lib/generated/prisma";

type SidebarProps = {
  dbUser: User;
};

const Sidebar = ({ dbUser }: SidebarProps) => {
  return (
    <SidebarWrapper>
      <SidebarContent dbUser={dbUser} />
    </SidebarWrapper>
  );
};

export default Sidebar;
