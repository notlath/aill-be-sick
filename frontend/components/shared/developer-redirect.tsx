"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DeveloperRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check the developer's saved view preference
    const savedView = localStorage.getItem("developerView") as
      | "PATIENT"
      | "CLINICIAN"
      | null;

    if (savedView === "CLINICIAN") {
      router.push("/dashboard");
    } else {
      router.push("/diagnosis");
    }
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
