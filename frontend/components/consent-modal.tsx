"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { acceptTerms } from "@/actions/accept-terms";
import { LEGAL_CONSTANTS } from "@/constants/legal";
import { AlertTriangle, Loader2, Shield, FileText } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ConsentModalProps {
  /**
   * Optional reasons to display why the user needs to accept terms.
   * E.g., "Terms of Service have been updated to version 1.1"
   */
  reasons?: string[];
}

/**
 * Consent Modal Component
 *
 * Non-dismissible modal shown to:
 * - Existing users who haven't accepted terms
 * - OAuth users after first login
 * - Users who need to re-accept after terms update
 *
 * This modal blocks the entire app until consent is given.
 */
const ConsentModal = ({ reasons = [] }: ConsentModalProps) => {
  const router = useRouter();
  const [acceptedMedicalDisclaimer, setAcceptedMedicalDisclaimer] =
    useState(false);
  const [acceptedAgeRequirement, setAcceptedAgeRequirement] = useState(false);
  const [acceptedTermsAndPrivacy, setAcceptedTermsAndPrivacy] = useState(false);

  const { execute, isExecuting } = useAction(acceptTerms, {
    onSuccess: ({ data }) => {
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("Thank you for accepting our terms.");
        // Refresh the page to update the consent state
        router.refresh();
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred. Please try again.");
    },
  });

  const allAccepted =
    acceptedMedicalDisclaimer &&
    acceptedAgeRequirement &&
    acceptedTermsAndPrivacy;

  const handleAccept = () => {
    if (!allAccepted) return;

    execute({
      acceptedMedicalDisclaimer: true,
      acceptedAgeRequirement: true,
      acceptedTermsAndPrivacy: true,
    });
  };

  return (
    <dialog className="modal modal-open">
      <div className="modal-box w-11/12 max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-warning/10 rounded-xl">
            <Shield className="w-8 h-8 text-warning" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Terms & Privacy Acceptance</h2>
            <p className="text-sm opacity-70">
              Please review and accept to continue
            </p>
          </div>
        </div>

        {/* Why this is showing */}
        {reasons.length > 0 ? (
          <div className="alert alert-info mb-4">
            <FileText className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Why am I seeing this?</h3>
              <ul className="list-disc list-inside text-sm mt-1">
                {reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="alert alert-info mb-4">
            <FileText className="w-5 h-5" />
            <p className="text-sm">
              Before you can use AI&apos;ll Be Sick, please review and accept our
              Privacy Policy and Terms of Service.
            </p>
          </div>
        )}

        {/* Medical Disclaimer - Prominent */}
        <div className="alert alert-error mb-4">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Important Medical Disclaimer</h3>
            <p className="text-sm">
              AI&apos;ll Be Sick is a <strong>research tool</strong>, NOT a
              replacement for professional medical care. AI predictions may be
              inaccurate. Always consult healthcare professionals for medical
              concerns.
            </p>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-base-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold mb-2">About This System</h3>
          <p className="text-sm opacity-80">
            This is a thesis research project deployed at{" "}
            <strong>{LEGAL_CONSTANTS.HOSPITAL_NAME}</strong> in{" "}
            {LEGAL_CONSTANTS.BARANGAY_NAME}. Your data helps improve disease
            detection and public health monitoring in your community.
          </p>
        </div>

        {/* Consent Checkboxes */}
        <div className="space-y-4 mb-6">
          {/* Checkbox 1: Medical Disclaimer */}
          <label className="cursor-pointer flex items-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-warning mt-0.5"
              checked={acceptedMedicalDisclaimer}
              onChange={(e) => setAcceptedMedicalDisclaimer(e.target.checked)}
            />
            <span className="text-sm leading-tight">
              I understand this is a <strong>research tool</strong> and{" "}
              <strong>NOT medical advice</strong>. I will consult healthcare
              professionals for medical concerns.
            </span>
          </label>

          {/* Checkbox 2: Age Requirement */}
          <label className="cursor-pointer flex items-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-warning mt-0.5"
              checked={acceptedAgeRequirement}
              onChange={(e) => setAcceptedAgeRequirement(e.target.checked)}
            />
            <span className="text-sm leading-tight">
              I am <strong>18 years or older</strong>, OR I have{" "}
              <strong>parental/guardian permission</strong> to use this service.
            </span>
          </label>

          {/* Checkbox 3: Terms & Privacy */}
          <label className="cursor-pointer flex items-start gap-3 p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
            <input
              type="checkbox"
              className="checkbox checkbox-warning mt-0.5"
              checked={acceptedTermsAndPrivacy}
              onChange={(e) => setAcceptedTermsAndPrivacy(e.target.checked)}
            />
            <span className="text-sm leading-tight">
              I have read and agree to the{" "}
              <Link
                href="/privacy"
                target="_blank"
                className="link link-primary"
              >
                Privacy Policy
              </Link>{" "}
              and{" "}
              <Link href="/terms" target="_blank" className="link link-primary">
                Terms of Service
              </Link>
              .
            </span>
          </label>
        </div>

        {/* Version Info */}
        <p className="text-xs opacity-60 mb-4 text-center">
          Privacy Policy v{LEGAL_CONSTANTS.PRIVACY_VERSION} | Terms of Service v
          {LEGAL_CONSTANTS.TERMS_VERSION} | Last Updated:{" "}
          {LEGAL_CONSTANTS.LAST_UPDATED}
        </p>

        {/* Accept Button */}
        <div className="modal-action">
          <button
            onClick={handleAccept}
            disabled={!allAccepted || isExecuting}
            className="btn btn-primary w-full"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Accept & Continue"
            )}
          </button>
        </div>

        {!allAccepted && (
          <p className="text-xs text-center opacity-60 mt-2">
            Please check all boxes above to continue
          </p>
        )}
      </div>

      {/* Non-dismissible backdrop - no click handler */}
      <div className="modal-backdrop bg-black/60"></div>
    </dialog>
  );
};

export default ConsentModal;
