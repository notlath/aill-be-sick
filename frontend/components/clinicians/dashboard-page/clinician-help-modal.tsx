"use client";

import { useState } from "react";
import {
  Lightbulb,
  LayoutDashboard,
  MapPinned,
  Bell,
  Users,
  FileBarChart2,
} from "lucide-react";

const ClinicianHelpModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    (
      document.querySelector(
        ".clinician-help-dialog",
      ) as HTMLDialogElement | null
    )?.close();
  };

  return (
    <dialog
      className={`help-dialog clinician-help-dialog modal ${isOpen ? "modal-open" : ""}`}
    >
      <div className="modal-box w-11/12 max-w-4xl max-h-[90vh] overflow-y-auto">
        <form method="dialog">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-sm sm:btn-md btn-circle btn-ghost absolute right-2 top-2 min-h-[44px] min-w-[44px]"
            aria-label="Close help guide"
          >
            ✕
          </button>
        </form>

        <div className="hero bg-base-200 rounded-box mb-6 shadow-sm">
          <div className="hero-content text-center py-6 md:py-8">
            <div>
              <div className="flex justify-center mb-3">
                <LayoutDashboard className="w-12 h-12 md:w-14 md:h-14 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Clinician Guide</h1>
              <p className="opacity-70 text-sm md:text-base font-medium">
                Quick overview of the tools available in your dashboard
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="card bg-base-200 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-300 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="card-body p-5">
              <h2 className="card-title text-base sm:text-lg gap-2">
                <LayoutDashboard className="w-5 h-5 text-primary" strokeWidth={2.5} />
                Dashboard
              </h2>
              <p className="text-sm opacity-80">
                Review illness patterns, group summaries, and trend data for
                fast surveillance insights.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-300 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="card-body p-5">
              <h2 className="card-title text-base sm:text-lg gap-2">
                <MapPinned className="w-5 h-5 text-primary" strokeWidth={2.5} />
                Map
              </h2>
              <p className="text-sm opacity-80">
                Inspect geographic spread, hotspots, and area-level activity for
                better local response planning.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-300 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="card-body p-5">
              <h2 className="card-title text-base sm:text-lg gap-2">
                <Bell className="w-5 h-5 text-primary" strokeWidth={2.5} />
                Alerts
              </h2>
              <p className="text-sm opacity-80">
                Check anomaly alerts and possible outbreak signals that may need
                quick validation.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-300 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="card-body p-5">
              <h2 className="card-title text-base sm:text-lg gap-2">
                <Users className="w-5 h-5 text-primary" strokeWidth={2.5} />
                Users
              </h2>
              <p className="text-sm opacity-80">
                Manage user access and review account roles when handling
                clinician and patient workflows.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 md:col-span-2 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-300 hover:-translate-y-0.5 hover:shadow-sm">
            <div className="card-body p-5">
              <h2 className="card-title text-base sm:text-lg gap-2">
                <FileBarChart2 className="w-5 h-5 text-primary" strokeWidth={2.5} />
                Healthcare Reports
              </h2>
              <p className="text-sm opacity-80">
                Open detailed report tables to analyze diagnosis records and
                patient-level context.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-primary btn-wide min-h-[44px] shadow-sm hover:shadow-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            Close Guide
          </button>
          <div className="divider my-4"></div>
          <div className="flex items-center justify-center gap-2 text-xs opacity-70 font-medium">
            <Lightbulb className="w-3.5 h-3.5" />
            <p>Tip: You can open this guide anytime from the Help button.</p>
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop bg-base-300/60 backdrop-blur-sm transition-opacity duration-300">
        <button type="button" onClick={handleClose} aria-label="Close modal backdrop">
          close
        </button>
      </form>
    </dialog>
  );
};

export default ClinicianHelpModal;
