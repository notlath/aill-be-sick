import RecentReports from "@/components/clinician/dashboard-page/recent-reports";
import TotalOutbreaks from "@/components/clinician/dashboard-page/total-outbreaks";
import TotalPatients from "@/components/clinician/dashboard-page/total-patients";
import TotalReports from "@/components/clinician/dashboard-page/total-reports";
import Trends from "@/components/clinician/dashboard-page/trends";

const ClinicianHomePage = () => {
  return (
    <main className="space-y-8 p-12">
      <h1 className="font-semibold text-5xl">Overview</h1>
      <div className="space-y-6">
        <div className="flex gap-6">
          <TotalPatients />
          <TotalReports />
          <TotalOutbreaks />
        </div>
        <div className="flex gap-6">
          <Trends />
          <RecentReports />
        </div>
      </div>
    </main>
  );
};

export default ClinicianHomePage;
