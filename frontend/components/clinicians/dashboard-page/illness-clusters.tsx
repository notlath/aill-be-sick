import IllnessClustersClient from "./clustering/illness-clusters-client";
import { Card, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

const DEFAULT_K = 4;

const IllnessClusters = ({
  dateRange,
}: {
  dateRange?: { start: Date | null; end: Date | null };
}) => {
  return <IllnessClustersClient initialK={DEFAULT_K} dateRange={dateRange} />;
};

const IllnessClustersSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="card card-body bg-base-100 border-base-300 border p-4 sm:p-6 sm:px-8">
        <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-6 xl:gap-4 relative">
          <div className="space-y-2 w-full xl:w-auto">
            <div className="skeleton h-6 w-32 mb-4" />
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-8 w-24 rounded-lg" />
              ))}
            </div>
            <div className="flex items-center flex-wrap gap-3 mt-4">
              <div className="skeleton h-4 w-12" />
              <div className="skeleton h-7 w-16" />
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="skeleton h-8 w-16 mt-3" />
          </div>
          <div className="space-y-1 text-left xl:text-right mt-4 xl:mt-0 pt-4 xl:pt-0 border-t border-base-200 xl:border-none w-full xl:w-auto flex flex-col items-start xl:items-end">
            <div className="skeleton h-10 sm:h-12 w-24 mb-2" />
            <div className="skeleton h-4 w-12" />
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">
            Loading Case Groups...
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} className="border-border h-[520px]">
              <CardHeader className="space-y-3">
                <div className="skeleton h-6 w-20" />
                <div className="skeleton h-20 w-full" />
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-3 w-24" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const IllnessClustersWrapper = ({
  dateRange,
}: {
  dateRange?: { start: Date | null; end: Date | null };
}) => {
  return (
    <Suspense fallback={<IllnessClustersSkeleton />}>
      <IllnessClusters dateRange={dateRange} />
    </Suspense>
  );
};

export default IllnessClustersWrapper;
