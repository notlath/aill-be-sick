import IllnessClusters from "@/components/clinicians/dashboard-page/illness-clusters";
import IllnessPatternsExplainer from "@/components/clinicians/dashboard-page/illness-patterns-explainer";

const ClinicianHomePage = () => {
  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br w-full overflow-x-hidden">
      {/* Hero Header Section */}
      <div className="w-full px-4 pt-20 pb-4 sm:pt-24 sm:pb-6 md:px-8 lg:px-12 md:pt-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="animate-fade-in flex flex-col gap-2 sm:gap-3">
            <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-transparent">
              Overview
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 pb-12 sm:pb-16 md:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl flex flex-col gap-6 sm:gap-8">
          {/* Illness Clusters - Full Width Premium Card */}
          <section
            className="animate-slide-up flex flex-col gap-4 sm:gap-6"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold">Illness Patterns</h2>
              <IllnessPatternsExplainer />
            </div>
            <div className="w-full relative space-y-6">
              <IllnessClusters />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ClinicianHomePage;
