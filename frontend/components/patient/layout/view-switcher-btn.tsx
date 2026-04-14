"use client";

import { Eye, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getDefaultLandingPathForDeveloperView,
  type DeveloperView,
} from "@/constants/default-landing-path";

const ViewSwitcherBtn = () => {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<
    "PATIENT" | "CLINICIAN" | "ADMIN"
  >("PATIENT");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load the saved view from localStorage
    const savedView = localStorage.getItem(
      "developerView",
    ) as DeveloperView | null;
    if (savedView) {
      setCurrentView(savedView);
    }
  }, []);

  const getNextView = (): "PATIENT" | "CLINICIAN" | "ADMIN" => {
    switch (currentView) {
      case "PATIENT":
        return "CLINICIAN";
      case "CLINICIAN":
        return "ADMIN";
      case "ADMIN":
        return "PATIENT";
    }
  };

  const getViewLabel = (view: "PATIENT" | "CLINICIAN" | "ADMIN"): string => {
    switch (view) {
      case "PATIENT":
        return "Patient";
      case "CLINICIAN":
        return "Clinician";
      case "ADMIN":
        return "Admin";
    }
  };

  const handleToggleView = () => {
    setIsLoading(true);
    const newView = getNextView();
    setCurrentView(newView);
    localStorage.setItem("developerView", newView);

    router.push(getDefaultLandingPathForDeveloperView(newView));
  };

  return (
    <button
      type="button"
      onClick={handleToggleView}
      disabled={isLoading}
      className="rounded-xl transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-base-200/80 active:scale-95 font-medium text-base-content/80 hover:text-base-content flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Eye className="w-4 h-4" />
      )}
      <span>
        {isLoading
          ? "Switching..."
          : `Switch to ${getViewLabel(getNextView())} View`}
      </span>
    </button>
  );
};

export default ViewSwitcherBtn;
