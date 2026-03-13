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
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          >
            x
          </button>
        </form>

        <div className="hero bg-base-200 rounded-box mb-6">
          <div className="hero-content text-center py-8">
            <div>
              <div className="flex justify-center mb-3">
                <LayoutDashboard className="w-14 h-14 text-primary" />
              </div>
              <h1 className="text-4xl font-bold mb-2">Clinician Guide</h1>
              <p className="opacity-70 text-sm">
                Quick overview of the tools available in your dashboard
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="card bg-base-200">
            <div className="card-body p-5">
              <h2 className="card-title text-base gap-2">
                <LayoutDashboard className="w-4 h-4 text-primary" />
                Dashboard
              </h2>
              <p className="text-sm opacity-80">
                Review illness patterns, group summaries, and trend data for
                fast surveillance insights.
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body p-5">
              <h2 className="card-title text-base gap-2">
                <MapPinned className="w-4 h-4 text-primary" />
                Map
              </h2>
              <p className="text-sm opacity-80">
                Inspect geographic spread, hotspots, and area-level activity for
                better local response planning.
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body p-5">
              <h2 className="card-title text-base gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Alerts
              </h2>
              <p className="text-sm opacity-80">
                Check anomaly alerts and possible outbreak signals that may need
                quick validation.
              </p>
            </div>
          </div>

          <div className="card bg-base-200">
            <div className="card-body p-5">
              <h2 className="card-title text-base gap-2">
                <Users className="w-4 h-4 text-primary" />
                Users
              </h2>
              <p className="text-sm opacity-80">
                Manage user access and review account roles when handling
                clinician and patient workflows.
              </p>
            </div>
          </div>

          <div className="card bg-base-200 md:col-span-2">
            <div className="card-body p-5">
              <h2 className="card-title text-base gap-2">
                <FileBarChart2 className="w-4 h-4 text-primary" />
                Healthcare Reports
              </h2>
              <p className="text-sm opacity-80">
                Open detailed report tables to analyze diagnosis records and
                patient-level context.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-primary btn-wide"
          >
            Close guide
          </button>
          <div className="divider my-3"></div>
          <div className="flex items-center justify-center gap-2 text-xs opacity-60">
            <Lightbulb className="w-3 h-3" />
            <p>Tip: You can open this guide anytime from the Help button.</p>
          </div>
        </div>
      </div>

      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={handleClose}>
          close
        </button>
      </form>
    </dialog>
  );
};

export default ClinicianHelpModal;
