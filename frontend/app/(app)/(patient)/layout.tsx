import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import { getCurrentDbUser } from "@/utils/user";
import { redirect } from "next/navigation";
import { ReactNode } from "react";

const Layout = async ({ children }: { children: ReactNode }) => {
  const { success: dbUser } = await getCurrentDbUser();

  if (dbUser && dbUser.role !== "PATIENT") {
    return redirect("/dashboard");
  }

  return <LayoutWrapper>{children}</LayoutWrapper>;
};

export default Layout;
