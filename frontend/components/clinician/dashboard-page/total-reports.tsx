import { getTotalDiagnosesCount } from "@/utils/diagnosis";
import { NotepadText } from "lucide-react";

const TotalReports = async () => {
  const { success: reportCount, error } = await getTotalDiagnosesCount();

  if (error) {
    // TODO: Error handling
    return null;
  }

  return (
    <article className="flex flex-1 items-center gap-4 bg-base-100 px-8 py-10 border border-border rounded-xl">
      <div className="bg-emerald-900/5 p-4 rounded-full w-max">
        <NotepadText className="stroke-[1.5] size-8 text-emerald-700" />
      </div>
      <div className="space-y-1">
        <h3 className="font-mono font-semibold text-3xl">{reportCount}</h3>
        <p className="text-muted">Total reports</p>
      </div>
    </article>
  );
};

export default TotalReports;
