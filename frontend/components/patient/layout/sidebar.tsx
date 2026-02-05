"use client";

import SidebarWrapper from "./sidebar-wrapper";
import SidebarContent from "./sidebar-content";
import { useEffect, useState } from "react";
import { getCurrentDbUser } from "@/utils/user";

const Sidebar = () => {
  const [dbUser, setDbUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      const { success, error } = await getCurrentDbUser();
      if (success) {
        setDbUser(success);
      } else {
        setError(error || "Failed to fetch user");
      }
      setLoading(false);
    }
    fetchUser();
  }, []);

  if (loading) {
    return (
      <SidebarWrapper>
        <div className="flex items-center justify-center h-full">
          <span className="loading loading-spinner loading-md"></span>
        </div>
      </SidebarWrapper>
    );
  }

  if (!dbUser || error) {
    return null;
  }

  return (
    <SidebarWrapper>
      <SidebarContent dbUser={dbUser} />
    </SidebarWrapper>
  );
};

export default Sidebar;
