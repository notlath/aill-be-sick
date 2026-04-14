"use client";

import HelpGuide from "@/components/patient/help-guide";
import { X } from "lucide-react";

export const HelpModal = () => {
  const handleClose = () => {
    (
      document.querySelector(".help-guide-dialog") as HTMLDialogElement
    )?.close();
  };

  return (
    <dialog className="help-guide-dialog modal backdrop:bg-black/60 backdrop:backdrop-blur-sm transition-all">
      <div className="modal-box w-11/12 max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto bg-base-100 shadow-2xl border border-base-content/10">
        <form method="dialog">
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close help guide"
            className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3 lg:right-4 lg:top-4 bg-base-200/50 hover:bg-base-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4">
          <HelpGuide />
        </div>
        
        <div className="modal-action mt-6 sm:mt-8 flex justify-center">
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-primary btn-wide shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={handleClose} className="cursor-pointer">close</button>
      </form>
    </dialog>
  );
};

export default HelpModal;
