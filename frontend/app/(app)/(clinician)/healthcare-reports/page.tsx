import { getAllDiagnoses } from "@/utils/diagnosis";
import { DataTable } from "@/components/clinicians/healthcare-reports-page/data-table";
import { columns } from "@/components/clinicians/healthcare-reports-page/columns";

const HealthcareReports = async () => {
  const { success: diagnoses, error } = await getAllDiagnoses({ take: 10 });

  if (error) {
    // TODO: Error handling
    return <div>Error loading healthcare reports: {error}</div>;
  }

  return (
    <main className="p-12 h-full">
      <h1 className="mb-8 font-semibold text-5xl">Healthcare Reports</h1>
      <DataTable columns={columns} data={diagnoses || []} />
    </main>
  );
};

export default HealthcareReports;
