"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type ViewMode = "PATIENT" | "CLINICIAN";

type DeveloperViewContextType = {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  isDeveloper: boolean;
};

const DeveloperViewContext = createContext<
  DeveloperViewContextType | undefined
>(undefined);

export const useDeveloperView = () => {
  const context = useContext(DeveloperViewContext);
  if (!context) {
    throw new Error(
      "useDeveloperView must be used within DeveloperViewProvider"
    );
  }
  return context;
};

type DeveloperViewProviderProps = {
  children: ReactNode;
  isDeveloper: boolean;
  initialView?: ViewMode;
};

export const DeveloperViewProvider = ({
  children,
  isDeveloper,
  initialView = "PATIENT",
}: DeveloperViewProviderProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);

  useEffect(() => {
    if (isDeveloper) {
      const savedView = localStorage.getItem(
        "developerView"
      ) as ViewMode | null;
      if (savedView) {
        setViewMode(savedView);
      }
    }
  }, [isDeveloper]);

  return (
    <DeveloperViewContext.Provider
      value={{ viewMode, setViewMode, isDeveloper }}
    >
      {children}
    </DeveloperViewContext.Provider>
  );
};
