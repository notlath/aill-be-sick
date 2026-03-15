"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getDefaultLandingPath,
  type DeveloperView,
} from "@/constants/default-landing-path";

export default function DeveloperRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check the developer's saved view preference
    const savedView = localStorage.getItem(
      "developerView",
    ) as DeveloperView | null;

    router.push(getDefaultLandingPath("DEVELOPER", savedView));
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <div className="loading loading-spinner loading-lg"></div>
        <p className="text-base-content/60">Redirecting...</p>
      </div>
    </div>
  );
}
