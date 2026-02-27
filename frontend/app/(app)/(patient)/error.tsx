'use client';

import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function PatientError({
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
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
      <p className="text-muted-foreground">An unexpected error occurred in the patient portal.</p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Try again
      </button>
    </div>
  );
}
