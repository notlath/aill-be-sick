"use client";

import { Eye, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ViewSwitcherBtnProps = {
  isDeveloper: boolean;
};

const ViewSwitcherBtn = ({ isDeveloper }: ViewSwitcherBtnProps) => {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<"PATIENT" | "CLINICIAN">(
    "PATIENT"
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load the saved view from localStorage
    const savedView = localStorage.getItem("developerView") as
      | "PATIENT"
      | "CLINICIAN"
      | null;
    if (savedView) {
      setCurrentView(savedView);
    }
  }, []);

  const handleToggleView = () => {
    setIsLoading(true);
    const newView = currentView === "PATIENT" ? "CLINICIAN" : "PATIENT";
    setCurrentView(newView);
    localStorage.setItem("developerView", newView);

    // Redirect to the appropriate home page
    if (newView === "CLINICIAN") {
      router.push("/dashboard");
    } else {
      router.push("/diagnosis");
    }
  };

  return (
    <button
      onClick={handleToggleView}
      disabled={isLoading}
      className="rounded-xl transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-200/80 active:scale-95 font-medium text-base-content/80 hover:text-base-content flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
      <span>
        {isLoading
          ? "Switching..."
          : `Switch to ${
              currentView === "PATIENT" ? "Clinician" : "Patient"
            } View`}
      </span>
    </button>
  );
};

export default ViewSwitcherBtn;
