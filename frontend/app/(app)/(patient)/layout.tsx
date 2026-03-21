import Sidebar from "@/components/patient/layout/sidebar";
import OnboardingModal from "@/components/patient/onboarding/onboarding-modal";
import ConsentModal from "@/components/consent-modal";
import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import HelpModal from "@/components/patient/layout/help-modal";
import { getCurrentDbUser } from "@/utils/user";
import { needsTermsUpdate, getTermsUpdateInfo } from "@/utils/check-terms-version";
import { forbidden, redirect, unauthorized } from "next/navigation";
import { ReactNode, Suspense } from "react";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={<PatientLayoutSkeleton />}>
      <PatientLayoutContent>{children}</PatientLayoutContent>
    </Suspense>
  );
};

const PatientLayoutContent = async ({ children }: { children: ReactNode }) => {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (error) {
    throw new Error(typeof error === "string" ? error : JSON.stringify(error));
  }

  if (!dbUser) {
    unauthorized();
  }

  // Allow PATIENT and DEVELOPER roles to access patient views
  if (dbUser.role !== "PATIENT" && dbUser.role !== ("DEVELOPER" as any)) {
    forbidden();
  }

  if (!dbUser.isOnboarded) {
    return redirect("/onboarding");
  }

  // Check if user needs to accept terms
  const requiresConsent = needsTermsUpdate(dbUser);
  const { reasons } = getTermsUpdateInfo(dbUser);

  return (
    <LayoutWrapper>
      <Sidebar dbUser={dbUser} />
      <OnboardingModal />
      <HelpModal />
      {/* Show consent modal if user hasn't accepted terms or needs to re-accept */}
      {requiresConsent && <ConsentModal reasons={reasons} />}
      <div className="flex flex-col min-h-full">
        <main className="flex-1 flex flex-col">{children}</main>
      </div>
    </LayoutWrapper>
  );
};

function PatientLayoutSkeleton() {
  return (
    <LayoutWrapper>
      <aside
        className="hidden md:block overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width] bg-base-100/60 backdrop-blur-xl border-r border-border/50 w-64 opacity-100"
        style={{
          boxShadow: "0 0 0 1px rgb(0 0 0 / 0.02)",
        }}
      >
        <div className="p-4 pt-6 w-64">
          {/* Header with user avatar placeholder */}
          <header className="flex justify-between items-center gap-3 mb-6 bg-base-300/40 p-1 rounded-xl -mx-1">
            <div className="flex flex-1 items-center gap-3 p-2.5 rounded-2xl">
              <div className="size-9 rounded-full animate-pulse bg-base-300" />
              <div className="h-4 w-24 animate-pulse bg-base-300 rounded" />
            </div>
          </header>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1.5 mt-10 mb-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse bg-base-300/50 rounded-xl"
              />
            ))}
          </nav>

          {/* Bottom section with border */}
          <div className="mt-auto pt-4 pb-4 border-t border-base-content/10">
            <div className="h-8 animate-pulse bg-base-300 rounded" />
          </div>
        </div>
      </aside>
    </LayoutWrapper>
  );
}

export default Layout;
