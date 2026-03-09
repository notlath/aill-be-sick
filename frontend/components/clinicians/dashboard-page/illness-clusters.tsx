import IllnessClustersClient from "./clustering/illness-clusters-client";
import { Card, CardHeader } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

const DEFAULT_K = 4;

const IllnessClusters = () => {
  return <IllnessClustersClient initialK={DEFAULT_K} />;
};

const IllnessClustersSkeleton = () => {
  return (
    <div className="space-y-6">
      <div className="card card-body bg-base-100 border-base-300 border">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="skeleton h-6 w-32 mb-4" />
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton h-8 w-24 rounded-lg" />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-4">
              <div className="skeleton h-4 w-12" />
              <div className="skeleton h-7 w-16" />
              <div className="skeleton h-4 w-32" />
            </div>
            <div className="skeleton h-8 w-16 mt-3" />
          </div>
          <div className="space-y-1 text-right flex flex-col items-end">
            <div className="skeleton h-12 w-24 mb-2" />
            <div className="skeleton h-4 w-12" />
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col gap-4">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="text-primary size-8 animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">
            Loading Illness Clusters...
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

const IllnessClustersWrapper = () => {
  return (
    <Suspense fallback={<IllnessClustersSkeleton />}>
      <IllnessClusters />
    </Suspense>
  );
};

export default IllnessClustersWrapper;
