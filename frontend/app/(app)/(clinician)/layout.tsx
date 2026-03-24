import Sidebar from "@/components/patient/layout/sidebar";
import ClinicianHelpModal from "@/components/clinicians/dashboard-page/clinician-help-modal";
import AlertsStoreProvider from "@/components/clinicians/alerts/alerts-store-provider";
import AlertsToastListener from "@/components/clinicians/alerts/alerts-toast-listener";
import ConsentModal from "@/components/consent-modal";
import LegalFooter from "@/components/shared/legal-footer";
import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import { getCurrentDbUser } from "@/utils/user";
import {
  needsTermsUpdate,
  getTermsUpdateInfo,
} from "@/utils/check-terms-version";
import { redirect } from "next/navigation";
import { ReactNode, Suspense } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={<ClinicianLayoutSkeleton />}>
      <ClinicianLayoutContent>{children}</ClinicianLayoutContent>
    </Suspense>
  );
};

const ClinicianLayoutContent = async ({
  children,
}: {
  children: ReactNode;
}) => {
  const { success: dbUser, error, code } = await getCurrentDbUser();

  if (error) {
    if (code === "NOT_AUTHENTICATED") {
      redirect("/clinician-login");
    }

    if (code === "USER_NOT_FOUND") {
      redirect("/auth/sync-error");
    }

    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }

  if (!dbUser) {
    redirect("/clinician-login");
  }

  // Keep invalid-role users out of clinician routes without falling back to 404.
  if (
    dbUser.role !== "CLINICIAN" &&
    dbUser.role !== ("DEVELOPER" as any) &&
    dbUser.role !== "ADMIN"
  ) {
    redirect("/");
  }

  if (dbUser.role === "CLINICIAN") {
    if (dbUser.approvalStatus === "PENDING_ADMIN_APPROVAL") {
      redirect("/waiting-for-approval");
    }

    if (dbUser.approvalStatus === "REJECTED") {
      redirect("/clinician-login");
    }
  }

  // Check if user needs to accept terms
  const requiresConsent = needsTermsUpdate(dbUser);
  const { reasons } = getTermsUpdateInfo(dbUser);

  return (
    <LayoutWrapper>
      <Sidebar dbUser={dbUser} />
      <ClinicianHelpModal />
      <AlertsStoreProvider />
      <AlertsToastListener />
      {/* Show consent modal if user hasn't accepted terms or needs to re-accept */}
      {requiresConsent && <ConsentModal reasons={reasons} />}
      <div className="flex flex-col min-h-full">
        <main className="flex-1">{children}</main>
        <LegalFooter />
      </div>
    </LayoutWrapper>
  );
};

function ClinicianLayoutSkeleton() {
  return (
    <LayoutWrapper>
      <div className="flex-1 p-3 md:p-6">
        <div className="h-8 w-56 rounded bg-base-300 animate-pulse" />
      </div>
    </LayoutWrapper>
  );
}

export default Layout;
