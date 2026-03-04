import IllnessClusters from "@/components/clinicians/dashboard-page/illness-clusters";

const ClinicianHomePage = () => {
  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br">
      {/* Hero Header Section */}
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px]">
          <div className="animate-fade-in space-y-3">
            <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-6xl font-semibold tracking-tight text-transparent">
              Overview
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="mx-auto max-w-[1600px] space-y-8">
          {/* Illness Clusters - Full Width Premium Card */}
          <section
            className="animate-slide-up space-y-4"
            style={{ animationDelay: "200ms" }}
          >
            <div>
              <h2 className="text-2xl font-semibold mb-1">Illness Patterns</h2>
              <p className="text-base-content/70 max-w-3xl text-sm">
                View patient diagnosis groups based on the variables you select.
              </p>
            </div>
            <IllnessClusters />
          </section>
        </div>
      </div>
    </main>
  );
};

export default ClinicianHomePage;
