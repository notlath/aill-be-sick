import { Suspense } from "react";
import CreatePatientForm from "@/components/clinicians/users-page/create-patient-form";

function CreatePatientSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="space-y-2">
          <div className="skeleton h-6 w-48" />
          <div className="skeleton h-4 w-64" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CreatePatientPage() {
  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      {/* Hero Header Section */}
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-fade-in space-y-3">
            <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
              Create Patient
            </h1>
            <p className="text-muted text-lg">
              Add a new patient to the system
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div
            className="animate-slide-up bg-white/80 backdrop-blur-sm rounded-2xl border border-border shadow-sm p-8"
            style={{ animationDelay: "200ms" }}
          >
            <Suspense fallback={<CreatePatientSkeleton />}>
              <CreatePatientForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
