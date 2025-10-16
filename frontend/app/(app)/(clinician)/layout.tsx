import LayoutWrapper from "@/components/layout/layout-wrapper";
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

  if (dbUser.role !== "CLINICIAN") {
    return redirect("/diagnosis");
  }

  return <LayoutWrapper>{children}</LayoutWrapper>;
};

export default Layout;
