import { TrendingUp } from "lucide-react";

const Trends = () => {
  return (
    <article className="group relative overflow-hidden bg-white/80 backdrop-blur-xl border border-base-300/50 rounded-[20px] p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:border-primary/30">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-3 rounded-[12px]">
            <TrendingUp className="size-6 text-primary stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-base-content/90">
              Trends
            </h2>
            <p className="text-sm text-muted mt-0.5">
              Disease patterns over time
            </p>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="h-64 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-base-200 to-base-300/50 rounded-full flex items-center justify-center">
              <TrendingUp className="size-8 text-muted" />
            </div>
            <p className="text-muted font-medium">
              Trend visualization coming soon
            </p>
          </div>
        </div>
      </div>
    </article>
  );
};

export default Trends;
