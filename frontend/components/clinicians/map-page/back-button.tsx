"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="btn btn-ghost btn-sm gap-2 absolute top-12 left-8"
      title="Go back to dashboard"
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}
