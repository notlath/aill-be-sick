import PatientClusters from "@/components/clinicians/dashboard-page/patient-clusters";
import ClusterInsights from "@/components/clinicians/dashboard-page/cluster-insights";

const ClinicianHomePage = () => {
  return (
    <main className="min-h-screen bg-gradient-to-br from-base-100 via-base-200/30 to-base-100">
      {/* Hero Header Section */}
      <div className="px-8 pt-12 pb-8 md:px-16 lg:px-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="space-y-3 animate-fade-in">
            <h1 className="font-semibold text-6xl tracking-tight bg-gradient-to-br from-base-content via-base-content to-base-content/70 bg-clip-text text-transparent">
              Overview
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* Patient Clusters - Full Width Premium Card */}
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <PatientClusters />
          </div>
        </div>
      </div>
    </main>
  );
};

export default ClinicianHomePage;
