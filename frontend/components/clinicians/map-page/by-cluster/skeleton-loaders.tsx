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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(4)].map((_, i) => (
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
      ))}
    </div>
  );
};

const ClusterDetailsSkeleton = () => {
  return (
    <div className="mt-2">
      <Card className="border">
        <CardHeader className="pb-2">
          <div className="skeleton h-6 w-64 mb-2" />
          <div className="flex gap-4">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-4 w-32" />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
            <div className="skeleton h-16 w-full" />
          </div>
        </CardContent>
      </Card>
      <div className="mt-4">
        <TimelineSkeleton />
      </div>
    </div>
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

const ClusterSelectSkeleton = () => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-base-content/70">
        Select group:
      </span>
      <div className="skeleton h-9 w-[260px]" />
    </div>
  );
};

export { MapSkeleton, StatsSkeletonCards, ClusterDetailsSkeleton, TimelineSkeleton, ClusterSelectSkeleton };
