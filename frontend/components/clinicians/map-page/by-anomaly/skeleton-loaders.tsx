"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const MapSkeleton = () => {
  return (
    <div className="rounded-xl overflow-hidden" aria-label="Loading map">
      <div className="skeleton h-[600px] w-full" />
    </div>
  );
};

const StatsSkeletonCards = () => {
  return (
    <>{[...Array(3)].map((_, i) => (
      <Card key={i} className="border-border">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 pb-2">
          <div className="skeleton h-4 w-24" />
          <div className="skeleton h-4 w-4" />
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="skeleton h-8 w-32 mb-2" />
          <div className="skeleton h-3 w-40" />
        </CardContent>
      </Card>
    ))}</>
  );
};

const TimelineSkeleton = () => {
  return (
    <Card className="relative overflow-hidden border">
      <CardHeader className="relative pb-2 flex flex-row items-center justify-between gap-4">
        <div className="skeleton h-6 w-48" />
        <div className="skeleton h-8 w-28" />
      </CardHeader>
      <CardContent className="relative pt-2">
        <div className="skeleton h-[220px] w-full" />
      </CardContent>
    </Card>
  );
};

const AnomalySummarySkeleton = () => {
  return (
    <Card className="relative overflow-hidden border">
      <div className="absolute inset-0 bg-base-100 opacity-90" />
      <CardHeader className="relative pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="skeleton h-6 w-40 mb-2" />
          <div className="skeleton h-20 w-full md:w-[400px]" />
        </div>
      </CardHeader>
      <CardContent className="relative pt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reason Flags */}
        <div>
          <div className="skeleton h-5 w-32 mb-4" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="skeleton h-4 w-24" />
                <div className="skeleton h-5 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Diseases */}
        <div>
          <div className="skeleton h-5 w-28 mb-4" />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="skeleton h-4 w-20" />
                <div className="skeleton h-5 w-14" />
              </div>
            ))}
          </div>
        </div>

        {/* Characteristics */}
        <div>
          <div className="skeleton h-5 w-32 mb-4" />
          <div className="skeleton h-20 w-full rounded-xl" />
        </div>

        {/* Affected Districts */}
        <div className="md:col-span-3">
          <div className="skeleton h-5 w-40 mb-4" />
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-6 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export { MapSkeleton, StatsSkeletonCards, TimelineSkeleton, AnomalySummarySkeleton };
