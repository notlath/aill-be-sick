"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

const StatsSkeletonCards = () => {
  return (
    <>
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
    </>
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

export { StatsSkeletonCards, TimelineSkeleton };
