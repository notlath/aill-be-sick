"use client";

import IllnessClusters from "@/components/clinicians/dashboard-page/illness-clusters";
import EndemicDiseaseSummary from "@/components/clinicians/dashboard-page/endemic-disease-summary";
import DiagnosisDateFilter from "@/components/clinicians/dashboard-page/clustering/diagnosis-date-filter";
import {
  TriangleAlert,
  TrendingDown,
  TrendingUp,
  Activity,
  X,
  CalendarDays,
} from "lucide-react";
import { useState } from "react";

// Condensed Mock data for Key Metrics - showing only significant trending items
const diseaseMetrics = [
  {
    name: "Influenza Watch",
    activeCases: 156,
    trend: "+24%",
    trendUp: true,
    detail: "Surge in dense areas",
  },
  {
    name: "Dengue Warning",
    activeCases: 42,
    trend: "+12%",
    trendUp: true,
    detail: "Recent outbreak in San Jose",
  },
  {
    name: "Diarrhea Decline",
    activeCases: 89,
    trend: "-5%",
    trendUp: false,
    detail: "Improving in rural sectors",
  },
];

const ClinicianHomePage = () => {
  const [showAlert, setShowAlert] = useState(true);
  const [dateRange, setDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({ start: null, end: null });

  return (
    <main className="from-base-100 via-base-200/30 to-base-100 min-h-screen bg-gradient-to-br w-full overflow-x-hidden">
      {/* Hero Header Section */}
      <div className="w-full px-4 pt-20 pb-4 sm:pt-24 sm:pb-6 md:px-8 lg:px-12 md:pt-12">
        <div className="mx-auto w-full max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-20">
          <div className="animate-fade-in flex flex-col gap-2 sm:gap-3">
            <h1 className="from-base-content via-base-content to-base-content/70 bg-gradient-to-br bg-clip-text text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-transparent">
              Overview
            </h1>
          </div>
          <div className="animate-fade-in flex items-center bg-base-100 border border-base-200 rounded-xl p-2 shadow-sm shrink-0">
            <DiagnosisDateFilter
              onDateRangeChange={(start, end) => setDateRange({ start, end })}
              currentStartDate={dateRange.start}
              currentEndDate={dateRange.end}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full px-4 pb-12 sm:pb-16 md:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-7xl flex flex-col gap-6 sm:gap-8">
{/*
          // Urgent Alerts Section - Static/Unused
          {showAlert && (
            <section className="animate-slide-up w-full flex flex-col gap-4 relative z-10">
              <div
                role="alert"
                className="alert alert-error shadow-sm relative"
              >
                <TriangleAlert className="stroke-current shrink-0 h-6 w-6" />
                <div className="flex-1">
                  <h3 className="font-bold">
                    Urgent: Potential Dengue Outbreak
                  </h3>
                  <div className="text-sm">
                    High concentration of suspected cases in San Jose district
                    reported in the last 48 hours. Focus monitoring in this
                    area.
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn btn-sm">View Map</button>
                  <button
                    className="btn btn-sm btn-ghost btn-circle"
                    onClick={() => setShowAlert(false)}
                    aria-label="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          )}
*/}

          {/* Key Metrics Grid - Static/Mock Data */}
          {/*
          <section
            className="animate-slide-up w-full"
            style={{ animationDelay: "50ms" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {diseaseMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="card bg-base-100 shadow-sm border border-base-200 hover:shadow-md transition-shadow"
                >
                  <div className="card-body p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-base-content/80">
                        {metric.name}
                      </h3>
                      <div
                        className={`flex items-center text-sm font-bold ${metric.trendUp === true ? "text-error" : metric.trendUp === false ? "text-success" : "text-base-content/50"}`}
                      >
                        {metric.trendUp === true && (
                          <TrendingUp className="w-4 h-4 mr-1 stroke-2" />
                        )}
                        {metric.trendUp === false && (
                          <TrendingDown className="w-4 h-4 mr-1 stroke-2" />
                        )}
                        {metric.trendUp === null && (
                          <Activity className="w-4 h-4 mr-1 stroke-2" />
                        )}
                        {metric.trend}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="text-3xl font-bold tracking-tight">
                        {metric.activeCases}
                      </div>
                      <div className="text-xs text-base-content/60 font-medium">
                        {metric.detail}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
          */}

          {/* Endemic Disease Awareness */}
          <section
            className="animate-slide-up w-full"
            style={{ animationDelay: "100ms" }}
          >
            <EndemicDiseaseSummary dateRange={dateRange} />
          </section>

          {/* Illness Clusters - Full Width Premium Card */}
          <section
            className="animate-slide-up flex flex-col gap-4 sm:gap-6"
            style={{ animationDelay: "200ms" }}
          >
            <div className="flex flex-col gap-1.5 sm:gap-2">
              <h2 className="text-xl sm:text-2xl font-semibold">
                Illness Patterns
              </h2>
            </div>
            <div className="w-full relative space-y-6">
              <IllnessClusters dateRange={dateRange} />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
};

export default ClinicianHomePage;
