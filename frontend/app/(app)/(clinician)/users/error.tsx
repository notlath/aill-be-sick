"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-[300px] w-full flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive animate-fade-in mx-auto max-w-[1600px]">
      <div className="flex flex-col items-center gap-2">
        <h2 className="text-xl font-semibold">Something went wrong!</h2>
        <p className="text-sm opacity-80">{error.message || "Failed to load users data."}</p>
      </div>
      <button
        onClick={() => reset()}
        className="btn btn-outline btn-error btn-sm"
      >
        Try again
      </button>
    </div>
  );
}
