import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import Sidebar from "@/components/patient/layout/sidebar";
import OnboardingModal from "@/components/patient/onboarding/onboarding-modal";
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

  // Allow PATIENT and DEVELOPER roles to access patient views
  if (dbUser.role !== "PATIENT" && dbUser.role !== ("DEVELOPER" as any)) {
    return redirect("/dashboard");
  }

  return (
    <LayoutWrapper>
      <Sidebar />
      <OnboardingModal />
      {children}
    </LayoutWrapper>
  );
};

export default Layout;
