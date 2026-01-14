import { getTotalDiagnosesCount } from "@/utils/diagnosis";
import { NotepadText } from "lucide-react";

const TotalReports = async () => {
  const { success: reportCount, error } = await getTotalDiagnosesCount();

  if (error) {
    // TODO: Error handling
    return null;
  }

  return (
    <article className="group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-base-300/50 rounded-[20px] p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-emerald-200">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center gap-6">
        {/* Icon Container - Apple-style with soft shadows */}
        <div className="flex-shrink-0 bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-[16px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-500 group-hover:scale-110">
          <NotepadText className="size-8 text-white stroke-[1.75]" />
        </div>

        {/* Content */}
        <div className="space-y-1.5 flex-1">
          <h3 className="font-semibold text-4xl tracking-tight tabular-nums text-base-content/90 group-hover:text-base-content transition-colors">
            {reportCount?.toLocaleString() ?? "0"}
          </h3>
          <p className="text-sm font-medium text-muted tracking-wide">
            Total Reports
          </p>
        </div>
      </div>
    </article>
  );
};

export default TotalReports;
