import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default function DiagnosisUnauthorized() {
  return (
    <div className="flex h-[50vh] w-full flex-col items-center justify-center gap-4 text-center">
      <ShieldAlert className="h-10 w-10 text-destructive" />
      <h2 className="text-2xl font-bold tracking-tight">Unauthorized Access</h2>
      <p className="text-muted-foreground">Please log in or verify your access to use the diagnosis tool.</p>
      <Link
        href="/login"
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Login
      </Link>
    </div>
  );
}
