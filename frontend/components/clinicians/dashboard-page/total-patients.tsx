import { getTotalPatientsCount } from "@/utils/user";
import { User } from "lucide-react";

const TotalPatients = async () => {
  const { success: patientCount, error } = await getTotalPatientsCount();

  if (error) {
    // TODO: Error handling
    return null;
  }

  return (
    <article className="flex flex-1 items-center gap-4 bg-base-100 px-8 py-10 border border-border rounded-xl">
      <div className="bg-sky-900/5 p-4 rounded-full w-max">
        <User className="stroke-[1.5] size-8 text-sky-700" />
      </div>
      <div className="space-y-1">
        <h3 className="font-mono font-semibold text-3xl">{patientCount}</h3>
        <p className="text-muted">Total patients</p>
      </div>
    </article>
  );
};

export default TotalPatients;
