import { Suspense } from "react";
import { getCurrentDbUser } from "@/utils/user";
import prisma from "@/prisma/prisma";
import PrivacyRightsContent from "@/components/privacy-rights/privacy-rights-content";

async function PrivacyRightsData() {
  const { success: dbUser, error } = await getCurrentDbUser();

  if (!dbUser) {
    throw new Error(error || "Failed to load user");
  }

  // Fetch audit logs related to consent
  const consentLogs = await prisma.auditLog.findMany({
    where: {
      userId: dbUser.id,
      action: {
        in: ["ACCEPT_PRIVACY", "ACCEPT_TERMS", "WITHDRAW_CONSENT", "DELETE_ACCOUNT"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <PrivacyRightsContent
      user={dbUser}
      consentLogs={consentLogs}
    />
  );
}

function PrivacyRightsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Status Section */}
      <section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8">
        <div className="space-y-4">
          <div className="h-6 w-32 skeleton" />
          <div className="flex gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-8 w-24 skeleton rounded-full" />
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8">
        <div className="space-y-4">
          <div className="h-6 w-40 skeleton" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <div className="w-2 h-2 rounded-full skeleton mt-2" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 skeleton" />
                  <div className="h-3 w-32 skeleton" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Actions Section */}
      <section className="bg-base-100/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8">
        <div className="space-y-4">
          <div className="h-6 w-36 skeleton" />
          <div className="flex gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-32 skeleton rounded-[10px]" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function PrivacyRightsPage() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="space-y-10 mx-auto p-8 pt-12 max-w-4xl flex-1 w-full relative">
        <div className="space-y-2">
          <h1 className="mb-1 font-semibold text-base-content text-4xl tracking-tight">
            Privacy Rights
          </h1>
          <p className="text-muted text-lg">
            View your consent history and manage your privacy settings
          </p>
        </div>

        <Suspense fallback={<PrivacyRightsSkeleton />}>
          <PrivacyRightsData />
        </Suspense>
      </div>
    </div>
  );
}