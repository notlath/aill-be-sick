"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  History, Lightbulb,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const OnboardingModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFullExample, setShowFullExample] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setTimeout(() => setIsOpen(true), 500);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    setIsOpen(false);
    (document.querySelector('.onboarding-dialog') as any)?.close();
  };

  const shortExample =
    "A 102.1°F fever has been present for three days, coupled with a dry cough and a clear, runny nose.";
  const longExample =
    "A 102.1°F fever has been present for three days, coupled with a dry cough and a clear, runny nose. My eyes are red and sensitive to light. A rash of small, non-itchy red spots started behind my ears a few hours ago and is now advancing onto my forehead. I'm experiencing a general feeling of tiredness and aches throughout my body.";

  return (
    <dialog className={`help-dialog onboarding-dialog modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box w-11/12 max-w-4xl max-h-[85vh] md:max-h-[90vh] overflow-y-auto">
        <form method="dialog">
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          >
            ✕
          </button>
        </form>

        {/* Hero Header */}
        <div className="hero bg-base-200 rounded-box mb-4 sm:mb-6">
          <div className="hero-content text-center py-4 sm:py-8">
            <div>
              <div className="flex justify-center mb-2 sm:mb-4">
                <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-success" />
              </div>
              <h1 className="text-3xl sm:text-5xl font-bold mb-2 sm:mb-3">Welcome!</h1>
              <p className="text-lg sm:text-xl mb-1 sm:mb-2">AI'll Be Sick</p>
              <p className="opacity-70 text-sm sm:text-base">
                Your AI-powered tool for diagnosing common infectious diseases
              </p>
            </div>
          </div>
        </div>

        {/* How to Use Section */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center">How to Use</h2>

          {/* Step 1 */}
          <div className="card bg-base-200 mb-3 sm:mb-4">
            <div className="card-body p-4 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="badge badge-success badge-lg">1</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    <h3 className="card-title text-base sm:text-lg">Describe your symptoms</h3>
                  </div>
                  <p className="mb-3 text-sm sm:text-base">
                    Type in the box what you're feeling. The more detail, the
                    better!
                  </p>
                  <div className="alert bg-success/10 border border-success/20 p-3 sm:p-4">
                    <div className="flex-1">
                      <div className="badge badge-sm mb-2">Example</div>
                      <p className="text-xs sm:text-sm">
                        "{showFullExample ? longExample : shortExample}"
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
          <div className="card bg-base-200">
            <div className="card-body p-4 sm:p-8">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="badge badge-success badge-lg">2</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-4 h-4 sm:w-5 sm:h-5 text-success" />
                    <h3 className="card-title text-base sm:text-lg">View your history</h3>
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

        {/* Footer */}
        <div className="text-center mt-4 sm:mt-6">
          <button onClick={handleClose} className="btn btn-success btn-wide sm:btn-md sm:w-auto">
            Got it, let's start! →
          </button>
          <div className="divider my-2 sm:my-4"></div>
          <div className="flex items-center justify-center gap-2 text-xs opacity-60">
            <Lightbulb className="w-3 h-3" />
            <p>Tip: Access this guide anytime via the Help button</p>
          </div>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={handleClose}>close</button>
      </form>
    </dialog>
  );
};

export default OnboardingModal;
