import { TriangleAlert } from "lucide-react";

const TotalOutbreaks = () => {
  return (
    <article className="group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-base-300/50 rounded-[20px] p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:scale-[1.02] hover:border-red-200">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative flex items-center gap-6">
        {/* Icon Container - Apple-style with soft shadows */}
        <div className="flex-shrink-0 bg-gradient-to-br from-red-500 to-red-600 p-5 rounded-[16px] shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-all duration-500 group-hover:scale-110">
          <TriangleAlert className="size-8 text-white stroke-[1.75]" />
        </div>

        {/* Content */}
        <div className="space-y-1.5 flex-1">
          <h3 className="font-semibold text-4xl tracking-tight tabular-nums text-base-content/90 group-hover:text-base-content transition-colors">
            171
          </h3>
          <p className="text-sm font-medium text-muted tracking-wide">
            Total Outbreaks
          </p>
        </div>
      </div>
    </article>
  );
};

export default TotalOutbreaks;
