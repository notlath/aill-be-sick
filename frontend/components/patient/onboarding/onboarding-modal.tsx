"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  History,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ListChecks,
} from "lucide-react";
import Link from "next/link";
import { LEGAL_CONSTANTS } from "@/constants/legal";

const OnboardingModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullExample, setShowFullExample] = useState(false);

  // Consent checkboxes state
  const [acceptedMedicalDisclaimer, setAcceptedMedicalDisclaimer] =
    useState(false);
  const [acceptedAgeRequirement, setAcceptedAgeRequirement] = useState(false);
  const [acceptedTermsAndPrivacy, setAcceptedTermsAndPrivacy] = useState(false);
  const [alreadyOnboarded, setAlreadyOnboarded] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setTimeout(() => setIsOpen(true), 500);
    } else {
      setAcceptedMedicalDisclaimer(true);
      setAcceptedAgeRequirement(true);
      setAcceptedTermsAndPrivacy(true);
      setAlreadyOnboarded(true);
    }
  }, []);

  const allAccepted =
    acceptedMedicalDisclaimer &&
    acceptedAgeRequirement &&
    acceptedTermsAndPrivacy;

  const handleClose = () => {
    if (!allAccepted) return; // Don't close if not all accepted

    // Store acceptance with version info
    localStorage.setItem("hasSeenOnboarding", "true");
    localStorage.setItem(
      "onboardingConsentVersion",
      JSON.stringify({
        termsVersion: LEGAL_CONSTANTS.TERMS_VERSION,
        privacyVersion: LEGAL_CONSTANTS.PRIVACY_VERSION,
        acceptedAt: new Date().toISOString(),
      })
    );

    setIsOpen(false);
    (document.querySelector(".onboarding-dialog") as HTMLDialogElement)?.close();
  };

  const shortExample =
    "First I got a very high temperature, a dry cough, profound tiredness, and a runny nose. I found small white spots in my mouth. Yesterday, a rash began at my hairline and spread down my chest.";
  const longExample =
    "First I got a very high temperature, a dry cough, profound tiredness, and a runny nose. I found small white spots in my mouth. Yesterday, a rash began at my hairline and spread down my chest.";

  return (
    <dialog
      className={`help-dialog onboarding-dialog modal ${isOpen ? "modal-open" : ""}`}
    >
      <div className="modal-box w-11/12 max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
        {/* Close Button - requires min 44pt touch area for accessibility */}
        {allAccepted && (
          <form method="dialog">
            <button
              onClick={handleClose}
              className="btn btn-sm sm:btn-md btn-circle btn-ghost absolute right-2 top-2 min-h-[44px] min-w-[44px]"
              aria-label="Close help modal"
            >
              ✕
            </button>
          </form>
        )}

        {/* Hero Header */}
        <div className="hero bg-base-200 rounded-box mb-4 sm:mb-6">
          <div className="hero-content text-center py-4 sm:py-8">
            <div>
              <div className="flex justify-center mb-2 sm:mb-4">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-success" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-3 tracking-tight">
                {alreadyOnboarded ? "App Guide" : "Welcome!"}
              </h1>
              <p className="text-lg sm:text-xl mb-1 sm:mb-2 font-medium">AI&apos;ll Be Sick</p>
              <p className="opacity-70 text-sm sm:text-base">
                Your AI-powered tool for identifying common infectious diseases
              </p>
            </div>
          </div>
        </div>

        {/* Medical Disclaimer Alert */}
        <div className="alert alert-warning mb-4 sm:mb-6">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <div>
            <h3 className="font-bold">Important</h3>
            <p className="text-sm">
              This is a <strong>research tool</strong>, NOT a replacement for
              professional medical care. Always consult healthcare professionals
              for medical concerns.
            </p>
          </div>
        </div>

        {/* How to Use Section */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center">
            How to Use
          </h2>

          {/* Step 1 */}
          <div className="card bg-base-200 mb-3 sm:mb-4">
            <div className="card-body p-4 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="badge badge-success badge-lg">1</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    <h3 className="card-title text-base sm:text-lg">
                      Describe your symptoms
                    </h3>
                  </div>
                  <p className="mb-3 text-sm sm:text-base">
                    Type in the box what you&apos;re feeling. The more detail, the
                    better!
                  </p>
                  <div className="alert bg-success/10 border border-success/20 p-3 sm:p-4">
                    <div className="flex-1">
                      <div className="badge badge-sm mb-2">Example</div>
                      <p className="text-xs sm:text-sm">
                        &quot;{showFullExample ? longExample : shortExample}&quot;
                      </p>
                      <button
                        onClick={() => setShowFullExample(!showFullExample)}
                        className="btn btn-xs btn-ghost mt-2 gap-1"
                      >
                        {showFullExample ? (
                          <>
                            Show less <ChevronUp className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Show more <ChevronDown className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="card bg-base-200 mb-3 sm:mb-4">
            <div className="card-body p-4 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="badge badge-success badge-lg">2</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <ListChecks className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    <h3 className="card-title text-base sm:text-lg">
                      Use the symptom checklist
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base">
                    Alternatively, you can select your symptoms from our comprehensive checklist organized by body parts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="card bg-base-200">
            <div className="card-body p-4 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="badge badge-success badge-lg">3</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    <h3 className="card-title text-base sm:text-lg">
                      View your history
                    </h3>
                  </div>
                  <p className="text-sm sm:text-base">
                    Check past consultations anytime by going to the{" "}
                    <span className="badge bg-success/10 border border-success/20 gap-1 text-xs sm:text-sm">
                      <History className="w-3 h-3" />
                      History
                    </span>{" "}
                    tab in the sidebar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Consent Section */}
        {!alreadyOnboarded && (
          <div className="card bg-base-200 mb-4 sm:mb-6">
          <div className="card-body p-4 sm:p-6">
            <h3 className="font-bold text-base sm:text-lg mb-3">
              Before you continue, please confirm:
            </h3>

            <div className="space-y-3">
              {/* Checkbox 1: Medical Disclaimer */}
              <label className="cursor-pointer flex items-start gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors">
                <input
                  type="checkbox"
                  className="checkbox checkbox-success checkbox-sm mt-0.5"
                  checked={acceptedMedicalDisclaimer}
                  onChange={(e) =>
                    setAcceptedMedicalDisclaimer(e.target.checked)
                  }
                />
                <span className="text-sm leading-tight">
                  I understand this is a <strong>research tool</strong> and{" "}
                  <strong>NOT medical advice</strong>. I will consult healthcare
                  professionals for medical concerns.
                </span>
              </label>

              {/* Checkbox 2: Age Requirement */}
              <label className="cursor-pointer flex items-start gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors">
                <input
                  type="checkbox"
                  className="checkbox checkbox-success checkbox-sm mt-0.5"
                  checked={acceptedAgeRequirement}
                  onChange={(e) => setAcceptedAgeRequirement(e.target.checked)}
                />
                <span className="text-sm leading-tight">
                  I am <strong>18 years or older</strong>, OR I have{" "}
                  <strong>parental/guardian permission</strong> to use this
                  service.
                </span>
              </label>

              {/* Checkbox 3: Terms & Privacy */}
              <label className="cursor-pointer flex items-start gap-3 p-2 rounded-lg hover:bg-base-300 transition-colors">
                <input
                  type="checkbox"
                  className="checkbox checkbox-success checkbox-sm mt-0.5"
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
                  <Link
                    href="/terms"
                    target="_blank"
                    className="link link-primary"
                  >
                    Terms of Service
                  </Link>
                  .
                </span>
              </label>
            </div>
          </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6">
          <button
            onClick={handleClose}
            disabled={!allAccepted}
            className="btn btn-success btn-wide sm:btn-md sm:w-auto min-h-[44px] shadow-sm hover:shadow-md transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            {alreadyOnboarded
              ? "Close Guide"
              : allAccepted
                ? "Got it, let's start! →"
                : "Please accept all terms above"}
          </button>

          {!allAccepted && (
            <p className="text-xs opacity-60 mt-2">
              Check all boxes above to continue
            </p>
          )}

          <div className="divider my-2 sm:my-4"></div>
          {!alreadyOnboarded && (
            <div className="flex items-center justify-center gap-2 text-xs opacity-60 font-medium">
              <Lightbulb className="w-3 h-3" />
              <p>Tip: Access this guide anytime via the Help button</p>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop - only closeable if all accepted */}
      <form method="dialog" className="modal-backdrop bg-base-300/60 backdrop-blur-sm transition-opacity duration-300">
        <button 
          onClick={allAccepted ? handleClose : undefined} 
          disabled={!allAccepted}
          aria-label="Close modal backdrop"
        >
          {allAccepted ? "close" : ""}
        </button>
      </form>
    </dialog>
  );
};

export default OnboardingModal;
