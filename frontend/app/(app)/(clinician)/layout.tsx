import Sidebar from "@/components/patient/layout/sidebar";
import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import { getCurrentDbUser } from "@/utils/user";
import { forbidden, unauthorized } from "next/navigation";
import { ReactNode } from "react";

const Layout = async ({ children }: { children: ReactNode }) => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (error) {
    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }

  if (!dbUser) {
    unauthorized();
  }

  // Allow CLINICIAN and DEVELOPER roles to access clinician views
  if (dbUser.role !== "CLINICIAN" && dbUser.role !== ("DEVELOPER" as any)) {
    forbidden();
  }

  return (
    <LayoutWrapper>
      <Sidebar />
      {children}
    </LayoutWrapper>
  );
};

export default Layout;
