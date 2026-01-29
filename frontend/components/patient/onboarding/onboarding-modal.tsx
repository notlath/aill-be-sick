"use client";

import { useEffect, useState } from "react";
import {
  Sparkles,
  MessageSquare,
  History,
  MapPin,
  Lightbulb,
  ChevronDown,
  ChevronUp,
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
  };

  const shortExample =
    "A 102.1°F fever has been present for three days, coupled with a dry cough and a clear, runny nose.";
  const longExample =
    "A 102.1°F fever has been present for three days, coupled with a dry cough and a clear, runny nose. My eyes are red and sensitive to light. A rash of small, non-itchy red spots started behind my ears a few hours ago and is now advancing onto my forehead. I'm experiencing a general feeling of tiredness and aches throughout my body.";

  return (
    <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
      <div className="modal-box w-11/12 max-w-4xl">
        <form method="dialog">
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
          >
            ✕
          </button>
        </form>

        {/* Hero Header */}
        <div className="hero bg-base-200 rounded-box mb-6">
          <div className="hero-content text-center py-8">
            <div>
              <div className="flex justify-center mb-4">
                <Sparkles className="w-16 h-16 text-success" />
              </div>
              <h1 className="text-5xl font-bold mb-3">Welcome!</h1>
              <p className="text-xl mb-2">AI'll Be Sick</p>
              <p className="opacity-70">
                Your AI-powered tool for diagnosing common infectious diseases
              </p>
            </div>
          </div>
        </div>

        {/* How to Use Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4 text-center">How to Use</h2>

          {/* Step 1 */}
          <div className="card bg-base-200 mb-4">
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="badge badge-success badge-lg">1</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-5 h-5 text-success" />
                    <h3 className="card-title">Describe your symptoms</h3>
                  </div>
                  <p className="mb-3">
                    Type in the box what you're feeling. The more detail, the
                    better!
                  </p>
                  <div className="alert bg-success/10 border border-success/20">
                    <div className="flex-1">
                      <div className="badge badge-sm mb-2">Example</div>
                      <p className="text-sm">
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
            <div className="card-body">
              <div className="flex items-start gap-4">
                <div className="badge badge-success badge-lg">2</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <History className="w-5 h-5 text-success" />
                    <h3 className="card-title">View your history</h3>
                  </div>
                  <p>
                    Check past consultations anytime by going to the{" "}
                    <span className="badge bg-success/10 border border-success/20 gap-1">
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
        <div className="text-center">
          <button onClick={handleClose} className="btn btn-success btn-wide">
            Got it, let's start! →
          </button>
          <div className="divider"></div>
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
