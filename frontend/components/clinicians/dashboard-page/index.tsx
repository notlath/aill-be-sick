import PatientClusters from "./patient-clusters";
import RecentReports from "./recent-reports";
import TotalOutbreaks from "./total-outbreaks";
import TotalPatients from "./total-patients";
import TotalReports from "./total-reports";
import Trends from "./trends";

const DashboardPage = () => {
  return (
    <section className="grid grid-cols-2 gap-6">
      <div className="col-span-2">
        <PatientClusters />
      </div>
      <TotalPatients />
      <TotalReports />
      <TotalOutbreaks />
      <Trends />
      <RecentReports />
    </section>
  );
};

export default DashboardPage;
