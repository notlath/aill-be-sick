import { Suspense } from "react";
import { getCurrentDbUser } from "@/utils/user";
import { redirect } from "next/navigation";
import LayoutWrapper from "@/components/shared/layout/layout-wrapper";
import DeveloperRedirect from "@/components/shared/developer-redirect";

const HomeContent = async () => {
  const { success: dbUser, error, code } = await getCurrentDbUser();

  if (error) {
    if (code === "NOT_AUTHENTICATED") {
      redirect("/login");
    }

    if (code === "USER_NOT_FOUND") {
      redirect("/auth/sync-error");
    }

    // TODO: Error handling for other DB errors
    return <div>Error: {JSON.stringify(error)}</div>;
  }

  if (!dbUser) {
    redirect("/login");
  }

  if (dbUser.role === "CLINICIAN") {
    redirect("/dashboard");
  }

  if (dbUser.role === "PATIENT") {
    if (!dbUser.isOnboarded) {
      redirect("/onboarding");
    }
    redirect("/diagnosis");
  }

  // For DEVELOPER role, use client-side redirect to check localStorage preference
  if (dbUser.role === ("DEVELOPER" as any)) {
    if (!dbUser.isOnboarded) {
      redirect("/onboarding");
    }
    return <DeveloperRedirect />;
  }

  return null;
};

// Fallback skeleton that mimics the app layout (sidebar + main content)
function AppSkeleton() {
  return (
    <LayoutWrapper>
      {/* Sidebar Skeleton */}
      <aside
        className="overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] will-change-[width] bg-base-100/60 backdrop-blur-xl border-r border-border/50 w-64 opacity-100"
        style={{
          boxShadow: "0 0 0 1px rgb(0 0 0 / 0.02)",
        }}
      >
        <div className="p-4 pt-6 w-64 flex flex-col h-full">
          {/* Header with user avatar placeholder */}
          <header className="flex justify-between items-center gap-3 mb-6 bg-base-300/40 p-1 rounded-xl -mx-1">
            <div className="flex flex-1 items-center gap-3 p-2.5 rounded-2xl">
              <div className="size-9 rounded-full animate-pulse bg-base-300" />
              <div className="h-4 w-24 animate-pulse bg-base-300 rounded" />
            </div>
          </header>

          {/* Navigation links */}
          <nav className="flex flex-col gap-1.5 mt-8 mb-4">
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
      {/* Main Content Skeleton */}
      <div className="p-6 w-full animate-pulse">
        <div className="h-[200px] w-full rounded-2xl bg-base-300/40" />
      </div>
    </LayoutWrapper>
  );
}

const HomePage = () => {
  return (
    <Suspense fallback={<AppSkeleton />}>
      <HomeContent />
    </Suspense>
  );
};

export default HomePage;
