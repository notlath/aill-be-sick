import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import Sidebar from "@/components/patient/layout/sidebar";
import { getCurrentDbUser } from "@/utils/user";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

const Layout = async ({ children }: { children: ReactNode }) => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    return redirect("/login");
  }

  if (error) {
    // TODO: Error handling
    return <div>Error: {JSON.stringify(error)}</div>;
  }

  // Allow CLINICIAN and DEVELOPER roles to access clinician views
  if (dbUser.role !== "CLINICIAN" && dbUser.role !== ("DEVELOPER" as any)) {
    return redirect("/diagnosis");
  }

  return (
    <LayoutWrapper>
      <Sidebar />
      {children}
    </LayoutWrapper>
  );
};

export default Layout;
