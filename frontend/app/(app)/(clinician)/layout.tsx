import Sidebar from "@/components/patient/layout/sidebar";
import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import { getCurrentDbUser } from "@/utils/user";
import { forbidden, unauthorized } from "next/navigation";
import { ReactNode, Suspense } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={<ClinicianLayoutSkeleton />}>
      <ClinicianLayoutContent>{children}</ClinicianLayoutContent>
    </Suspense>
  );
};

const ClinicianLayoutContent = async ({ children }: { children: ReactNode }) => {
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
      <Sidebar dbUser={dbUser} />
      {children}
    </LayoutWrapper>
  );
};

function ClinicianLayoutSkeleton() {
  return (
    <LayoutWrapper>
      <div className="flex-1 p-6">
        <div className="h-8 w-56 rounded bg-base-300 animate-pulse" />
      </div>
    </LayoutWrapper>
  );
}

export default Layout;
