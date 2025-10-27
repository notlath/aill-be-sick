import { Clock } from "lucide-react";

const RecentReports = () => {
  return (
    <article className="group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-base-300/50 rounded-[20px] p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:border-secondary/30">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 p-3 rounded-[12px]">
            <Clock className="size-6 text-secondary stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-base-content/90">
              Recent Reports
            </h2>
            <p className="text-sm text-muted mt-0.5">
              Latest patient diagnoses
            </p>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="h-64 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-base-200 to-base-300/50 rounded-full flex items-center justify-center">
              <Clock className="size-8 text-muted" />
            </div>
            <p className="text-muted font-medium">Reports list coming soon</p>
          </div>
        </div>
      </div>
    </article>
  );
};

export default RecentReports;
