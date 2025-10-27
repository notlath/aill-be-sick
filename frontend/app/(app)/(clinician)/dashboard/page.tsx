import PatientClusters from "@/components/clinicians/dashboard-page/patient-clusters";
import RecentReports from "@/components/clinicians/dashboard-page/recent-reports";
import TotalOutbreaks from "@/components/clinicians/dashboard-page/total-outbreaks";
import TotalPatients from "@/components/clinicians/dashboard-page/total-patients";
import TotalReports from "@/components/clinicians/dashboard-page/total-reports";
import Trends from "@/components/clinicians/dashboard-page/trends";

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
            <p className="text-lg text-muted max-w-2xl">
              Real-time insights into patient health, disease patterns, and
              population trends.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 pb-16 md:px-16 lg:px-24">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {/* Stats Grid - Apple-style cards */}
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-slide-up"
            style={{ animationDelay: "100ms" }}
          >
            <TotalPatients />
            <TotalReports />
            <TotalOutbreaks />
          </div>

          {/* Patient Clusters - Full Width Premium Card */}
          <div className="animate-slide-up" style={{ animationDelay: "200ms" }}>
            <PatientClusters />
          </div>

          {/* Analytics Grid */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-slide-up"
            style={{ animationDelay: "300ms" }}
          >
            <Trends />
            <RecentReports />
          </div>
        </div>
      </div>
    </main>
  );
};

export default ClinicianHomePage;
