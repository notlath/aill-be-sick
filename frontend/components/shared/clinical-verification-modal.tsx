"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

const ClinicalVerificationCard = dynamic(
  () => import("@/components/shared/clinical-verification-card"),
  { ssr: false }
);

type ClinicalVerificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  disease: string;
  chatId?: string;
  verificationStatus?: string | null;
  verificationPayload?: unknown;
  readOnly?: boolean;
  extractedSymptomIds?: string[];
};

const ClinicalVerificationModal = ({
  isOpen,
  onClose,
  disease,
  chatId,
  verificationStatus,
  verificationPayload,
  readOnly,
  extractedSymptomIds,
}: ClinicalVerificationModalProps) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  // Handle modal open/close
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    if (isOpen) {
      modal.showModal();
    } else {
      modal.close();
    }
  }, [isOpen]);

  // Handle escape key and click outside
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    const handleClose = () => {
      onClose();
    };

    modal.addEventListener("close", handleClose);
    return () => modal.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={modalRef}
      className="modal modal-bottom sm:modal-middle"
      aria-label="Clinical verification"
    >
      <div className="modal-box max-w-2xl max-h-[85vh] flex flex-col p-0 bg-base-100">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-4 py-3 border-b border-base-300/50 shrink-0">
          <h3 className="text-lg font-semibold text-base-content">
            Clinical Verification
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Close verification"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <ClinicalVerificationCard
            disease={disease}
            chatId={chatId}
            verificationStatus={verificationStatus}
            verificationPayload={verificationPayload}
            readOnly={readOnly}
            extractedSymptomIds={extractedSymptomIds}
          />
        </div>
      </div>

      {/* Backdrop - click to close */}
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          close
        </button>
      </form>
    </dialog>
  );
};

export default ClinicalVerificationModal;
